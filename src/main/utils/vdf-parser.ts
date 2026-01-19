
// Robust VDF Parser for handling nested structures like localconfig.vdf
export function parseVdf(text: string): any {
  if (!text) return {}

  const lines = text.split('\n')
  const root: any = {}
  const stack: any[] = [root]
  let currentKey = ''
  let expectBracket = false

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim()
    
    // Skip comments and empty lines
    if (!line || line.startsWith('//')) continue

    // Handle opening brace
    if (line.includes('{')) {
      const newObj = {}
      if (currentKey) {
        stack[stack.length - 1][currentKey] = newObj
      } else {
        // If no key was waiting, this might be a root object or array item (less common in VDF)
      }
      stack.push(newObj)
      expectBracket = false
      continue
    }

    // Handle closing brace
    if (line.includes('}')) {
      stack.pop()
      continue
    }

    // Handle Key-Value pairs or Key-Object definitions
    // Match "Key" "Value" OR "Key"
    const matches = line.match(/"([^"]+)"(?:\s+"([^"]+)")?/)
    
    if (matches) {
      const key = matches[1]
      const value = matches[2]

      if (value !== undefined) {
        // It's a key-value pair
        stack[stack.length - 1][key] = value
      } else {
        // It's a key for an object
        currentKey = key
        expectBracket = true
      }
    }
  }

  return root
}
