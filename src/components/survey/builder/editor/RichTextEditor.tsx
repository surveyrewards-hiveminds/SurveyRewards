import React from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { Text } from "../../../language/Text";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
  error?: boolean | string;
  readOnly?: boolean;
}

const toolbarOptions = [
  [{ header: [1, 2, 3, false] }],
  ["bold", "italic", "underline"],
  [{ list: "ordered" }, { list: "bullet" }],
  [{ align: [] }],
  ["link", "image", "video"],
  ["clean"],
];
const modules = {
  toolbar: toolbarOptions,
};

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  className = "",
  required = false,
  error = false,
  readOnly = false,
}: RichTextEditorProps) {
  React.useEffect(() => {
    // Inject CSS styles for readonly state
    const styleId = "readonly-quill-styles";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = `
        .readonly-quill * {
          cursor: not-allowed !important;
        }
        
        .readonly-quill .ql-editor {
          background-color: #f3f4f6 !important;
          cursor: not-allowed !important;
          color: #6b7280 !important;
          pointer-events: none !important;
        }
        
        .readonly-quill .ql-toolbar {
          background-color: #f9fafb !important;
          border-color: #d1d5db !important;
          cursor: not-allowed !important;
          pointer-events: none !important;
          opacity: 0.6;
        }
        
        .readonly-quill .ql-toolbar * {
          cursor: not-allowed !important;
          pointer-events: none !important;
        }
        
        .readonly-quill .ql-container {
          border-color: #d1d5db !important;
          cursor: not-allowed !important;
        }
        
        .readonly-quill .ql-toolbar .ql-stroke {
          stroke: #9ca3af !important;
        }
        
        .readonly-quill .ql-toolbar .ql-fill {
          fill: #9ca3af !important;
        }
        
        .readonly-quill .ql-editor::before {
          color: #9ca3af !important;
          cursor: not-allowed !important;
        }
        
        .readonly-quill .ql-picker {
          cursor: not-allowed !important;
          pointer-events: none !important;
        }
        
        .readonly-quill .ql-picker-options {
          display: none !important;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  return (
    <div>
      <ReactQuill
        theme="snow"
        value={value}
        onChange={(val, _, source) => {
          // Only update if the change was made by the user
          if (source === "user") {
            onChange(val);
          }
        }}
        placeholder={placeholder}
        className={`${className} ${
          required && error ? "border border-red-500" : ""
        } ${readOnly ? "readonly-quill" : ""}`}
        style={{ background: "white" }}
        modules={modules}
        readOnly={readOnly}
      />
      {required && error && (
        <div className="text-red-500 text-xs mt-1">
          {typeof error === "string" ? error : <Text tid="form.required" />}
        </div>
      )}
    </div>
  );
}
