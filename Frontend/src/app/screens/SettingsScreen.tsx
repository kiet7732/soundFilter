import { Settings, Zap, Download, Bell, Shield } from "lucide-react";
import { Switch } from "../components/ui/switch"; 

export function SettingsScreen() {
  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[#8B5CF6] to-[#06B6D4] bg-clip-text text-transparent">
            Settings
          </h1>
          <p className="text-gray-400 mt-1">Customize your SoundFilter AI experience</p>
        </div>

        {/* Processing Settings */}
        <div className="relative group">
          <div className="absolute inset-0 bg-purple-500/10 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-purple-400" />
              Processing Settings
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                <div>
                  <p className="font-medium text-white">High Quality Mode</p>
                  <p className="text-sm text-gray-400">Use maximum quality for audio processing</p>
                </div>
                <Switch />
              </div>

              <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                <div>
                  <p className="font-medium text-white">Auto DSP Enhancement</p>
                  <p className="text-sm text-gray-400">Automatically apply noise reduction filters</p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                <div>
                  <p className="font-medium text-white">GPU Acceleration</p>
                  <p className="text-sm text-gray-400">Use GPU for faster processing (requires compatible hardware)</p>
                </div>
                <Switch defaultChecked />
              </div>
            </div>
          </div>
        </div>

        {/* Export Settings */}
        <div className="relative group">
          <div className="absolute inset-0 bg-cyan-500/10 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Download className="w-5 h-5 text-cyan-400" />
              Export Settings
            </h3>
            
            <div className="space-y-4">
              <div className="p-4 bg-white/5 rounded-xl">
                <label className="block font-medium text-white mb-2">Default Export Format</label>
                <select className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white">
                  <option>WAV (Lossless)</option>
                  <option>MP3 (320kbps)</option>
                  <option>FLAC (Lossless)</option>
                  <option>AAC (256kbps)</option>
                </select>
              </div>

              <div className="p-4 bg-white/5 rounded-xl">
                <label className="block font-medium text-white mb-2">Sample Rate</label>
                <select className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white">
                  <option>44.1 kHz</option>
                  <option>48 kHz</option>
                  <option>96 kHz</option>
                  <option>192 kHz</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="relative group">
          <div className="absolute inset-0 bg-green-500/10 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Bell className="w-5 h-5 text-green-400" />
              Notifications
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                <div>
                  <p className="font-medium text-white">Processing Complete</p>
                  <p className="text-sm text-gray-400">Get notified when audio processing is complete</p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                <div>
                  <p className="font-medium text-white">Email Reports</p>
                  <p className="text-sm text-gray-400">Receive weekly processing statistics</p>
                </div>
                <Switch />
              </div>
            </div>
          </div>
        </div>

        {/* Account & Privacy */}
        <div className="relative group">
          <div className="absolute inset-0 bg-orange-500/10 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-orange-400" />
              Account & Privacy
            </h3>
            
            <div className="space-y-3">
              <button className="w-full p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-all text-left">
                <p className="font-medium text-white">Manage Subscription</p>
                <p className="text-sm text-gray-400">Pro Plan - Renews Mar 25, 2026</p>
              </button>

              <button className="w-full p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-all text-left">
                <p className="font-medium text-white">Privacy & Data</p>
                <p className="text-sm text-gray-400">Manage your data and privacy settings</p>
              </button>

              <button className="w-full p-4 bg-red-500/10 border border-red-500/30 rounded-xl hover:bg-red-500/20 transition-all text-left">
                <p className="font-medium text-red-400">Delete Account</p>
                <p className="text-sm text-gray-400">Permanently delete your account and all data</p>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
