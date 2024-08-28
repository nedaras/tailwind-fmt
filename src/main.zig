const std = @import("std");
const scrap_buffer = @import("scrap_buffer.zig");
const buffered = @import("buffered.zig");
const fs = std.fs;
const log = std.log;
const io = std.io;
const simd = std.simd;
const mem = std.mem;
const Allocator = mem.Allocator;

// sort element by output css class order

const Arguments = struct {
    input_file: ?[:0]const u8,
    output_file: ?[:0]const u8,
};

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{ .verbose_log = true }){};
    defer _ = gpa.deinit();

    const allocator = gpa.allocator();

    const arguments = try getArguments(allocator);

    if (arguments.input_file == null) {
        std.process.exit(1);
    }

    if (arguments.output_file == null) {
        std.process.exit(1);
    }

    const input_file = fs.cwd().openFile(arguments.input_file.?, .{}) catch |err| {
        std.log.err("{}", .{err});
        std.process.exit(1);

    };
    defer input_file.close();

    var input_file_reader = io.bufferedReader(input_file.reader());

    const output_file = try fs.cwd().createFile(arguments.output_file.?, .{});
    defer output_file.close();

    var output_file_writer = io.bufferedWriter(output_file.writer());

    // these buffers are so we wouldnt need to allocate memory exept if needed.
    var array_buffer: [2048]u8 = undefined;

    var buffered_array = buffered.BufferedArrayList(u8).init(allocator, &array_buffer);
    defer buffered_array.deinit();
    
    // no simd impl

    var quote = false;
    while (true) {
        const line = buffered.readUntilDelimiterArrayList(&input_file_reader, &buffered_array, '"') catch |err| switch (err) {
            // todo: we should write out left buffer
            error.EndOfStream => break,
            else => return err,
        };

        if (quote) {
            defer quote = !quote;

            var iter = mem.splitScalar(u8, line, ' ');
            while (iter.next()) |i| {
                if (i.len == 0) continue;
                std.debug.print("{s}\n", .{i});
            }

            _ = try output_file_writer.write("some-class\"");

            continue;
        }

        if(mem.endsWith(u8, line, "class=")) {
            quote = !quote;
        }

        try output_file_writer.writer().print("{s}\"", .{line});
    }

    try output_file_writer.flush();
    std.debug.print("writen to file: '{s}'\n", .{arguments.output_file.?});
}

fn getArguments(allocator: Allocator) std.process.ArgIterator.InitError!Arguments {
    var arguments: Arguments = .{
        .input_file = null,
        .output_file = null,
    };

    var args_iter = try std.process.argsWithAllocator(allocator); // nice that OFM errors can be ignored
    defer args_iter.deinit();

    while (args_iter.next()) |arg| {
        if (mem.eql(u8, arg, "-i")) {
            arguments.input_file = args_iter.next();
        }

        if (mem.eql(u8, arg, "-o")) {
            arguments.output_file = args_iter.next();
        }
    }

    return arguments;
}
