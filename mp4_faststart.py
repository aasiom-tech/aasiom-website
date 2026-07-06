from pathlib import Path
import struct
import sys


def read_u32(data, pos):
    return struct.unpack(">I", data[pos:pos + 4])[0]


def write_u32(data, pos, value):
    data[pos:pos + 4] = struct.pack(">I", value)


def read_u64(data, pos):
    return struct.unpack(">Q", data[pos:pos + 8])[0]


def write_u64(data, pos, value):
    data[pos:pos + 8] = struct.pack(">Q", value)


def atoms(data, start=0, end=None):
    end = len(data) if end is None else end
    pos = start
    while pos + 8 <= end:
        size = read_u32(data, pos)
        typ = data[pos + 4:pos + 8]
        header = 8
        if size == 1:
            if pos + 16 > end:
                break
            size = read_u64(data, pos + 8)
            header = 16
        elif size == 0:
            size = end - pos
        if size < header or pos + size > end:
            break
        yield pos, size, typ, header
        pos += size


def patch_chunk_offsets(atom, delta):
    container_types = {
        b"moov", b"trak", b"mdia", b"minf", b"stbl", b"edts", b"udta",
        b"meta", b"ilst", b"moof", b"traf",
    }

    def walk(start, end):
        for pos, size, typ, header in atoms(atom, start, end):
            if typ == b"stco":
                count_pos = pos + header + 4
                count = read_u32(atom, count_pos)
                table = count_pos + 4
                for i in range(count):
                    off_pos = table + i * 4
                    write_u32(atom, off_pos, read_u32(atom, off_pos) + delta)
            elif typ == b"co64":
                count_pos = pos + header + 4
                count = read_u32(atom, count_pos)
                table = count_pos + 4
                for i in range(count):
                    off_pos = table + i * 8
                    write_u64(atom, off_pos, read_u64(atom, off_pos) + delta)
            elif typ in container_types:
                inner_start = pos + header
                if typ == b"meta":
                    inner_start += 4
                walk(inner_start, pos + size)

    walk(0, len(atom))


def faststart(src, dst):
    data = Path(src).read_bytes()
    top = list(atoms(data))
    moov = next(((p, s) for p, s, t, _ in top if t == b"moov"), None)
    if not moov:
        Path(dst).write_bytes(data)
        return "no-moov"

    moov_pos, moov_size = moov
    first_mdat = next((p for p, _, t, _ in top if t == b"mdat"), None)
    if first_mdat is not None and moov_pos < first_mdat:
        Path(dst).write_bytes(data)
        return "already-faststart"

    moov_atom = bytearray(data[moov_pos:moov_pos + moov_size])
    patch_chunk_offsets(moov_atom, moov_size)
    without_moov = data[:moov_pos] + data[moov_pos + moov_size:]

    insert_at = 0
    for pos, size, typ, _ in atoms(without_moov):
        if typ == b"ftyp":
            insert_at = pos + size
            break

    Path(dst).write_bytes(without_moov[:insert_at] + moov_atom + without_moov[insert_at:])
    return "moved-moov"


if __name__ == "__main__":
    print(faststart(sys.argv[1], sys.argv[2]))
