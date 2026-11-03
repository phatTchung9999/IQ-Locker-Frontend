// Run from client/: swift scripts/generate-icons.swift
import AppKit

let ink = NSColor(srgbRed: 38/255, green: 57/255, blue: 78/255, alpha: 1)
let background = NSColor(srgbRed: 231/255, green: 232/255, blue: 234/255, alpha: 1)
func png(_ size: Int) throws -> Data {
    let bitmap = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: size, pixelsHigh: size,
        bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
        colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: bitmap)
    let scale = CGFloat(size) / 256
    NSGraphicsContext.current!.cgContext.scaleBy(x: scale, y: scale)
    let outline = NSBezierPath(roundedRect: NSRect(x: 16, y: 16, width: 224, height: 224), xRadius: 34, yRadius: 34)
    background.setFill(); outline.fill()
    ink.setStroke(); outline.lineWidth = 16; outline.stroke()
    let text = "IQ" as NSString
    let attributes: [NSAttributedString.Key: Any] = [
        .font: NSFont(name: "Arial-BoldMT", size: 112)!, .foregroundColor: ink,
    ]
    let bounds = text.size(withAttributes: attributes)
    text.draw(at: NSPoint(x: (256-bounds.width)/2, y: (256-bounds.height)/2), withAttributes: attributes)
    NSGraphicsContext.restoreGraphicsState()
    return bitmap.representation(using: .png, properties: [:])!
}
for (file, size) in [("logo192.png",192), ("logo512.png",512), ("apple-touch-icon.png",180)] {
    try png(size).write(to: URL(fileURLWithPath: "public/\(file)"))
}
// ICO entries can contain PNG data. Include every declared tab-icon size.
let sizes = [16,24,32,48,64]
let images = try sizes.map { try png($0) }
var ico = Data()
func u16(_ value: Int) { var n = UInt16(value).littleEndian; withUnsafeBytes(of: &n) { ico.append(contentsOf: $0) } }
func u32(_ value: Int) { var n = UInt32(value).littleEndian; withUnsafeBytes(of: &n) { ico.append(contentsOf: $0) } }
u16(0); u16(1); u16(sizes.count)
var offset = 6 + 16 * sizes.count
for (size, image) in zip(sizes, images) {
    ico.append(contentsOf: [UInt8(size),UInt8(size),0,0]); u16(1); u16(32)
    u32(image.count); u32(offset); offset += image.count
}
for image in images { ico.append(image) }
try ico.write(to: URL(fileURLWithPath: "public/favicon.ico"))
