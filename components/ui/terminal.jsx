"use client"

export const Terminal = ({ children }) => {
  return (
    <div className="bg-[#1A1A1A] rounded-lg border border-[#3C3C3C] overflow-hidden">
      <div className="flex gap-2 p-2 border-b border-[#3C3C3C] bg-[#2C2C2C]">
        <div className="w-3 h-3 rounded-full bg-[#FF5F56]" />
        <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
        <div className="w-3 h-3 rounded-full bg-[#27C93F]" />
      </div>
      <div className="p-4 font-mono text-sm h-64 overflow-y-auto">
        <div className="space-y-2">
          {children}
        </div>
      </div>
    </div>
  )
}

export const Command = ({ command, output }) => {
  return (
    <div className="space-y-1">
      <div className="flex items-center space-x-2">
        <span className="text-green-400">$</span>
        <span className="text-gray-300">{command}</span>
      </div>
      {output && (
        <div className="text-gray-400 pl-6 whitespace-pre-wrap">
          {output}
        </div>
      )}
    </div>
  )
} 