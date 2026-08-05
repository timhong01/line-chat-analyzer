import AppKit
import CoreGraphics
import Foundation

func fail(_ message: String) -> Never {
    FileHandle.standardError.write((message + "\n").data(using: .utf8)!)
    exit(2)
}

func point(_ values: ArraySlice<String>) -> CGPoint {
    guard values.count == 2,
          let x = Double(values[values.startIndex]),
          let y = Double(values[values.index(after: values.startIndex)]) else {
        fail("Expected x and y coordinates")
    }
    return CGPoint(x: x, y: y)
}

func postKey(_ keyCode: CGKeyCode, flags: CGEventFlags = []) {
    guard let down = CGEvent(keyboardEventSource: nil, virtualKey: keyCode, keyDown: true),
          let up = CGEvent(keyboardEventSource: nil, virtualKey: keyCode, keyDown: false) else {
        fail("Unable to create keyboard event")
    }
    down.flags = flags
    up.flags = flags
    down.post(tap: .cghidEventTap)
    usleep(40_000)
    up.post(tap: .cghidEventTap)
}

let arguments = Array(CommandLine.arguments.dropFirst())
guard let command = arguments.first else {
    fail("Usage: macos-input position|click x y|copy-all|escape|scroll amount")
}

switch command {
case "position":
    let location = NSEvent.mouseLocation
    let height = NSScreen.screens.first(where: { $0.frame.contains(location) })?.frame.maxY
        ?? NSScreen.main?.frame.height
        ?? 0
    print("\(Int(location.x)) \(Int(height - location.y))")
case "click":
    let location = point(arguments.dropFirst())
    guard let move = CGEvent(mouseEventSource: nil, mouseType: .mouseMoved,
                             mouseCursorPosition: location, mouseButton: .left),
          let down = CGEvent(mouseEventSource: nil, mouseType: .leftMouseDown,
                             mouseCursorPosition: location, mouseButton: .left),
          let up = CGEvent(mouseEventSource: nil, mouseType: .leftMouseUp,
                           mouseCursorPosition: location, mouseButton: .left) else {
        fail("Unable to create mouse event")
    }
    move.post(tap: .cghidEventTap)
    usleep(80_000)
    down.post(tap: .cghidEventTap)
    usleep(60_000)
    up.post(tap: .cghidEventTap)
case "copy-all":
    postKey(0, flags: .maskCommand) // Command-A
    usleep(100_000)
    postKey(8, flags: .maskCommand) // Command-C
case "escape":
    postKey(53)
case "scroll":
    guard arguments.count == 2, let amount = Int32(arguments[1]),
          let event = CGEvent(scrollWheelEvent2Source: nil, units: .line,
                              wheelCount: 1, wheel1: amount, wheel2: 0, wheel3: 0) else {
        fail("Usage: macos-input scroll amount")
    }
    event.post(tap: .cghidEventTap)
default:
    fail("Unknown command: \(command)")
}
