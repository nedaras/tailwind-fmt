const std = @import("std");
const io = std.io;
const mem = std.mem;
const Allocator = mem.Allocator;

pub fn BufferedArrayList(comptime T: type) type {
    return struct {
        const Self = @This();

        array_list: ArrayList,
        buffer: []T,
        items: []T,
        allocator: Allocator,

        pub const ArrayList = std.ArrayListUnmanaged(T);

        pub fn init(allocator: Allocator, buffer: []T) Self {
            return .{
                .buffer = buffer,
                .items = buffer[0..0],
                .array_list = ArrayList{},
                .allocator = allocator,
            };
        }

        pub fn deinit(self: *Self) void {
            if (swapped(self)) {
                self.array_list.deinit(self.allocator);
            }
        }

        pub fn appendSlice(self: *Self, items: []const u8) Allocator.Error!void {
            if (swapped(self)) {
                defer self.items = self.array_list.items;
                return try self.array_list.appendSlice(self.allocator, items);
            }

            const old_len = self.items.len;
            const new_len = old_len + items.len;

            if (self.items.len + items.len > self.buffer.len) {
                defer self.items = self.array_list.items;
                try resize(self, new_len);
            }

            self.items.len = new_len;
            @memcpy(self.items[old_len..][0..items.len], items);
        }

        pub fn resize(self: *Self, new_len: usize) Allocator.Error!void {
            if (swapped(self)) {
                defer self.items = self.array_list.items;
                return try self.array_list.resize(self.allocator, new_len);
            }

            if (new_len > self.buffer.len) {
                defer self.items = self.array_list.items;

                try self.array_list.resize(self.allocator, new_len);
                @memcpy(self.array_list.items[0..self.items.len], self.items);

                return;
            }

            self.items.len = new_len;
        }

        pub fn clearRetainingCapacity(self: *Self) void {
            if (swapped(self)) {
                defer self.items = self.array_list.items;
                self.array_list.clearRetainingCapacity();
            }
            self.items.len = 0;
        }

        pub fn swapped(self: *const Self) bool {
            return self.buffer.ptr != self.items.ptr;
        }

        pub const Writer = io.Writer(*Self, Allocator.Error, write);

        pub fn writer(self: *Self) Writer {
            return .{ .context = self };
        }

        pub fn write(self: *Self, bytes: []const u8) Allocator.Error!usize {
            try self.appendSlice(bytes);
            return bytes.len;
        }
    };
}

pub fn readUntilDelimiterOrEofArrayList(buffered_reader: anytype, array_list: anytype, delimiter: u8) !?[]u8 {
    array_list.clearRetainingCapacity();
    streamUntilDelimiter(buffered_reader, array_list.writer(), delimiter) catch |err| switch (err) {
        error.EndOfStream => if (array_list.items.len == 0) {
            return null;
        },
        else => |e| return e,
    };
    return array_list.items;
}

pub fn readUntilDelimiterArrayList(buffered_reader: anytype, array_list: anytype, delimiter: u8) ![]u8 {
    array_list.clearRetainingCapacity();
    try streamUntilDelimiter(buffered_reader, array_list.writer(), delimiter);
    return array_list.items;
}

pub fn streamUntilDelimiter(buffered_reader: anytype, writer: anytype, delimiter: u8) !void {
    while (true) {
        const start = buffered_reader.start;
        const end = buffered_reader.end;

        if (mem.indexOfScalar(u8, buffered_reader.buf[start..end], delimiter)) |i| {
            try writer.writeAll(buffered_reader.buf[start .. start + i]);
            buffered_reader.start += i + 1;
            break;
        }

        try writer.writeAll(buffered_reader.buf[start..end]);

        const bytes = try buffered_reader.unbuffered_reader.read(buffered_reader.buf[0..]);

        buffered_reader.start = 0;
        buffered_reader.end = bytes;

        if (bytes == 0) {
            return error.EndOfStream;
        }

    }
}
