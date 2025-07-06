import { useState } from 'react'
import Codeeditor from './components/Codeeditor'
import './App.css'

function App() {
  const [minHeightReached, setMinHeightReached] = useState(false)

  return (
    <div className="App">
      <Codeeditor minHeightReached={minHeightReached} />
    </div>
  )
}

export default App
