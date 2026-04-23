import React from 'react';
import Button from '../ui/Button';
import { Zap, X } from 'lucide-react';

/**
 * Bottom panel for displaying compilation and execution results.
 * @param {Object} props
 * @param {string} props.output - Executed code output
 * @param {string} props.executionTime - Execution time status
 * @param {function} props.onClose - Close handler
 */
const CompilerOutput = ({ output, executionTime, onClose }) => {
  return (
    <div className="compiler-output">
      <div className="compiler-header">
        <div className="compiler-header-left">
          <h3>Output</h3>
          {executionTime && (
            <span className="execution-time">
              <Zap size={12} className="inline mr-1" /> {executionTime}
            </span>
          )}
        </div>
        <Button variant="none" className="close-compiler" onClick={onClose}>
          <X size={16} />
        </Button>
      </div>
      <div className="compiler-body">
        <pre>{output || "No output yet. Run your code to see results."}</pre>
      </div>
    </div>
  );
};

export default CompilerOutput;
