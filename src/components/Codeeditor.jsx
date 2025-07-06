// React ke hooks import kar rahe hain
import { useState, useEffect } from "react";

// Monaco Editor component import kar rahe hain
import Editor from "@monaco-editor/react";

// HTTP requests bhejne ke liye axios import
import axios from "axios";

// CSS file import for styling
import "./EditorStyles.css";

// Import for framer-motion
import { motion, AnimatePresence } from "framer-motion";

// Import for icons
import { Play, Download, Upload, RotateCcw, Terminal, Code, Zap } from "lucide-react";

// Import for react-hot-toast
import toast, { Toaster } from "react-hot-toast";

// Main component
const Codeeditor = ({ minHeightReached }) => {
  // Language select karne ke liye state (default: cpp)
  const [language, setLanguage] = useState("cpp");

  // User ke likhe code ke liye state
  const [code, setCode] = useState("");

  // Store the full result object for detailed output
  const [result, setResult] = useState(null);

  // Jab code run ho raha ho toh "Running..." show karne ke liye state
  const [isRunning, setIsRunning] = useState(false);

  // Custom input for the code
  const [customInput, setCustomInput] = useState("");

  // Show input section
  const [showInput, setShowInput] = useState(false);

  // Execution time and memory used
  const [executionTime, setExecutionTime] = useState(null);
  const [memoryUsed, setMemoryUsed] = useState(null);

  // Judge0 ke language IDs (yeh IDs API ke through code compile karne ke liye use hoti hain)
  const languageMap = {
    cpp: { id: 54, name: "C++", extension: "cpp" },
    python: { id: 71, name: "Python", extension: "py" },
    java: { id: 62, name: "Java", extension: "java" },
    javascript: { id: 63, name: "JavaScript", extension: "js" },
    c: { id: 50, name: "C", extension: "c" },
    csharp: { id: 51, name: "C#", extension: "cs" },
    go: { id: 60, name: "Go", extension: "go" },
    rust: { id: 73, name: "Rust", extension: "rs" },
    php: { id: 68, name: "PHP", extension: "php" },
    ruby: { id: 72, name: "Ruby", extension: "rb" },
  };

  // Jab language change ho, toh default template code update ho jaye
  useEffect(() => {
    setCode(defaultTemplates[language] || "// Start coding...");
  }, [language]);

  // Default templates for different languages
  const defaultTemplates = {
    cpp: `#include <iostream>
using namespace std;

int main() {
    cout << "Hello from Judge0!" << endl;
    return 0;
}`,
    python: `print("Hello from Judge0!")
print("Python is awesome!")`,
    java: `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello from Judge0!");
    }
}`,
    javascript: `console.log("Hello from Judge0!");
console.log("JavaScript is awesome!");`,
    c: `#include <stdio.h>

int main() {
    printf("Hello from Judge0!\\n");
    return 0;
}`,
    csharp: `using System;

class Program {
    static void Main() {
        Console.WriteLine("Hello from Judge0!");
    }
}`,
    go: `package main

import "fmt"

func main() {
    fmt.Println("Hello from Judge0!")
}`,
    rust: `fn main() {
    println!("Hello from Judge0!");
}`,
    php: `<?php
echo "Hello from Judge0!";
?>`,
    ruby: `puts "Hello from Judge0!"`,
  };

  // Run button click hone par code compile/run hone ka kaam ye function karega
  const handleRun = async () => {
    if (!code.trim()) {
      toast.error("Please write some code first!");
      return;
    }

    setIsRunning(true);
    setResult(null);
    setExecutionTime(null);
    setMemoryUsed(null);

    const startTime = Date.now();
    const loadingToast = toast.loading("Compiling and running your code...");

    const payload = {
      source_code: code,
      language_id: languageMap[language].id,
      stdin: customInput,
    };

    try {
      // Submit code
      const submitResponse = await axios.post(
        "http://localhost:2358/submissions?base64_encoded=false",
        payload,
        {
          headers: { "Content-Type": "application/json" },
        }
      );

      const token = submitResponse.data.token;
      
      // Poll for result
      let result = null;
      for (let i = 0; i < 30; i++) {
        try {
          const resultResponse = await axios.get(
            `http://localhost:2358/submissions/${token}?base64_encoded=true`
          );
          
          result = resultResponse.data;
          
          if (result.status && 
              result.status.description !== "In Queue" && 
              result.status.description !== "Processing") {
            break;
          }
          
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error("Error polling result:", error);
          break;
        }
      }

      toast.dismiss(loadingToast);

      if (result) {
        const endTime = Date.now();
        const totalTime = endTime - startTime;
        setResult(result);
        setExecutionTime(result.time || (totalTime / 1000).toFixed(3));
        setMemoryUsed(result.memory || "N/A");
        if (result.status.description === "Accepted") {
          toast.success("Code executed successfully!");
        } else {
          toast.error(`Execution failed: ${result.status.description}`);
        }
      } else {
        setResult({ status: { description: "Timeout" }, compile_output: null, stderr: null, stdout: null });
        toast.error("Execution timeout");
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error("Error:", error);
      setResult({ status: { description: "Error" }, compile_output: null, stderr: error.response?.data?.message || error.message, stdout: null });
      toast.error("Failed to execute code");
    } finally {
      setIsRunning(false);
    }
  };

  const handleReset = () => {
    setCode(defaultTemplates[language] || "// Start coding...");
    setResult(null);
    setCustomInput("");
    setExecutionTime(null);
    setMemoryUsed(null);
    toast.success("Code reset!");
  };

  const handleDownload = () => {
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `code.${languageMap[language].extension}`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Code downloaded!");
  };

  const handleUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setCode(e.target.result);
        toast.success("File uploaded successfully!");
      };
      reader.readAsText(file);
    }
  };

  // Helper to decode base64 strings
  function decodeBase64(str) {
    if (!str) return "";
    try {
      return atob(str);
    } catch {
      return "";
    }
  }

  // Jo UI dikh rahi hai screen par, wo yaha render ho rahi hai
  return (
    <>
      <Toaster position="top-right" />
      <motion.main 
        className={`main-container ${minHeightReached ? "full" : "with-header"}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header with controls */}
        <motion.div 
          className="header-controls"
          initial={{ y: -50 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div className="left-controls">
            <div className="language-selector">
              <Code className="icon" />
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="language-select"
              >
                {Object.entries(languageMap).map(([key, lang]) => (
                  <option key={key} value={key}>{lang.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="right-controls">
            <button className="control-btn" onClick={() => setShowInput(!showInput)} title="Toggle Input">
              <Terminal className="icon" />
            </button>
            <button className="control-btn" onClick={handleReset} title="Reset Code">
              <RotateCcw className="icon" />
            </button>
            <button className="control-btn" onClick={handleDownload} title="Download Code">
              <Download className="icon" />
            </button>
            <label className="control-btn upload-btn" title="Upload Code">
              <Upload className="icon" />
              <input
                type="file"
                accept=".cpp,.py,.java,.js,.c,.cs,.go,.rs,.php,.rb,.txt"
                onChange={handleUpload}
                style={{ display: "none" }}
              />
            </label>
            <button
              className="run-button"
              onClick={handleRun}
              disabled={isRunning}
              title="Run Code"
            >
              {isRunning ? <Zap className="icon" /> : <Play className="icon" />}
              {isRunning ? "Running..." : "Run Code"}
            </button>
          </div>
        </motion.div>

        {/* Input Section */}
        <AnimatePresence>
          {showInput && (
            <motion.div
              className="input-section"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="input-header">
                <Terminal className="icon" />
                <span>Custom Input (stdin)</span>
              </div>
              <textarea
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder="Enter custom input for your program..."
                className="input-textarea"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Editor */}
        <motion.div 
          className="editor-wrapper"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Editor
            height="100%"
            language={language}
            value={code}
            onChange={(val) => setCode(val || "")}
            theme="vs-dark"
            options={{
              automaticLayout: true,
              fontSize: 14,
              minimap: { enabled: true },
              scrollBeyondLastLine: false,
              wordWrap: "on",
              lineNumbers: "on",
              roundedSelection: false,
              readOnly: false,
              cursorStyle: "line",
              automaticLayout: true,
              scrollbar: {
                vertical: "visible",
                horizontal: "visible",
              },
            }}
          />
        </motion.div>

        {/* Output Section */}
        <motion.div 
          className="output-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className="output-header">
            <Terminal className="icon" />
            <span>Output</span>
            {(executionTime || memoryUsed) && (
              <div className="execution-info">
                {executionTime && <span>⏱️ {executionTime}s</span>}
                {memoryUsed && <span>💾 {memoryUsed}KB</span>}
              </div>
            )}
          </div>
          <div className="output-content">
            {result ? (
              <>
                {result.status && result.status.description && (
                  <div style={{ fontWeight: "bold", marginBottom: 8 }}>
                    Status: {result.status.description}
                  </div>
                )}
                {result.compile_output && (
                  <div style={{ color: "#e74c3c", marginBottom: 8 }}>
                    <strong>Compilation Error:</strong>
                    <pre>{decodeBase64(result.compile_output)}</pre>
                  </div>
                )}
                {result.stderr && !result.compile_output && (
                  <div style={{ color: "#e67e22", marginBottom: 8 }}>
                    <strong>Runtime Error:</strong>
                    <pre>{decodeBase64(result.stderr)}</pre>
                  </div>
                )}
                {result.stdout && !result.compile_output && !result.stderr && (
                  <div style={{ color: "#2ecc71", marginBottom: 8 }}>
                    <strong>Output:</strong>
                    <pre>{decodeBase64(result.stdout)}</pre>
                  </div>
                )}
                {!result.stdout && !result.stderr && !result.compile_output && (
                  <pre>No output.</pre>
                )}
              </>
            ) : (
              <pre>Output will appear here...</pre>
            )}
          </div>
        </motion.div>
      </motion.main>
    </>
  );
};

// Component ko export kar rahe hain taki dusri file me use ho sake
export default Codeeditor;
