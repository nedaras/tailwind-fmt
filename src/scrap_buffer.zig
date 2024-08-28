// no multithreading

pub const len = 4096;

var buffer: [len]u8 = undefined;
const buffer_index = 0;

pub fn scrap(amount: usize) ![]u8 {
    if (amount > len) return error.SizeToBig;
    if (amount + buffer_index > len) buffer_index = 0;

    return buffer[buffer_index .. buffer_index + amount];
}

pub fn scrapAll() *[len]u8 {
    return &buffer;
}
