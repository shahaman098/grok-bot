import Foundation
import AppKit
import ScreenCaptureKit
import AVFoundation
import CoreGraphics

final class RecorderEvents: NSObject, SCRecordingOutputDelegate, SCStreamDelegate {
    var finished = false
    var failure: Error?
    func recordingOutputDidStartRecording(_ output: SCRecordingOutput) { print("RECORDING_STARTED"); fflush(stdout) }
    func recordingOutputDidFinishRecording(_ output: SCRecordingOutput) { finished = true; print("RECORDING_FINISHED"); fflush(stdout) }
    func recordingOutput(_ output: SCRecordingOutput, didFailWithError error: Error) { failure = error; finished = true; print("RECORDING_FAILED: \(error.localizedDescription)"); fflush(stdout) }
    func stream(_ stream: SCStream, didStopWithError error: Error) { failure = error; print("CAPTURE_STOPPED: \(error.localizedDescription)"); fflush(stdout) }
}

@main struct GrokRecorder {
    @MainActor static func main() async {
        _ = NSApplication.shared
        do {
            let args = CommandLine.arguments
            guard args.count == 4, let seconds = Int(args[2]), seconds > 0, seconds <= 600 else {
                throw NSError(domain:"demo", code:1, userInfo:[NSLocalizedDescriptionKey:"Usage: record-grok output.mp4 max-seconds stop-file"])
            }
            let url = URL(fileURLWithPath: args[1])
            guard !FileManager.default.fileExists(atPath: url.path) else { throw NSError(domain:"demo", code:2,userInfo:[NSLocalizedDescriptionKey:"Output already exists"]) }
            let content = try await SCShareableContent.excludingDesktopWindows(true, onScreenWindowsOnly: false)
            let candidates = content.windows.filter { $0.owningApplication?.bundleIdentifier == "com.anysphere.sand" && $0.title == "Grok Bot" && $0.frame.width > 400 }
            guard let window = candidates.max(by: { $0.frame.width*$0.frame.height < $1.frame.width*$1.frame.height }) else { throw NSError(domain:"demo",code:3,userInfo:[NSLocalizedDescriptionKey:"Grok Bot window not found"]) }
            let filter = SCContentFilter(desktopIndependentWindow: window)
            let config = SCStreamConfiguration()
            config.width = 1280
            config.height = Int((1280 * window.frame.height / window.frame.width).rounded()) / 2 * 2
            config.minimumFrameInterval = CMTime(value:1,timescale:30)
            config.showsCursor = true
            config.capturesAudio = true
            config.captureMicrophone = false
            config.sampleRate = 48000
            config.channelCount = 2
            config.excludesCurrentProcessAudio = true
            let events = RecorderEvents()
            let stream = SCStream(filter:filter,configuration:config,delegate:events)
            let recordingConfig = SCRecordingOutputConfiguration()
            recordingConfig.outputURL = url
            recordingConfig.outputFileType = .mp4
            recordingConfig.videoCodecType = .h264
            let recording = SCRecordingOutput(configuration:recordingConfig,delegate:events)
            try stream.addRecordingOutput(recording)
            try await stream.startCapture()
            for _ in 0..<seconds {
                if FileManager.default.fileExists(atPath:args[3]) || events.failure != nil { break }
                try await Task.sleep(for:.seconds(1))
            }
            try await stream.stopCapture()
            for _ in 0..<100 {
                if events.finished { break }
                try await Task.sleep(for:.milliseconds(100))
            }
            if let error = events.failure { throw error }
            guard events.finished else { throw NSError(domain:"demo",code:4,userInfo:[NSLocalizedDescriptionKey:"Recording finalization was not confirmed"]) }
            print("SAVED \(url.path)")
        } catch { fputs("ERROR: \(error.localizedDescription)\n",stderr); exit(1) }
    }
}
