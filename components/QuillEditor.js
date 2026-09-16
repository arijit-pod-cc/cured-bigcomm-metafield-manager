"use client";

import React, { useEffect, useRef, useState } from "react";
import "quill/dist/quill.snow.css";

/**
 * QuillEditor component - Rich text editor with customizable toolbar
 *
 * @param {string} value - HTML content
 * @param {function} onChange - Callback when content changes
 * @param {object} options - Quill options
 */
export default function QuillEditor({
  value,
  onChange,
  placeholder = "Enter text...",
}) {
  const editorRef = useRef(null);
  const quillRef = useRef(null);
  const isInitializedRef = useRef(false);
  const changeHandlerRef = useRef(null);

  useEffect(() => {
    // Only run on client side
    if (typeof window === "undefined") return;

    // Prevent double initialization in React strict mode
    if (isInitializedRef.current) return;

    let isMounted = true;

    const initializeQuill = async () => {
      try {
        // Dynamically import Quill only on client
        const { default: Quill } = await import("quill");

        if (!isMounted || !editorRef.current) return;

        // Initialize Quill with single container
        const quill = new Quill(editorRef.current, {
          theme: "snow",
          placeholder,
          modules: {
            toolbar: [
              // Text formatting
              ["bold", "italic", "underline"],
              
              // Headers
              [{ header: [1, 2, 3, false] }],
              
              // Font family
              [{ font: [] }],
              
              // Lists
              [{ list: "ordered" }, { list: "bullet" }],
              
              // Link
              ["link"],
            ],
          },
        });

        quillRef.current = quill;
        isInitializedRef.current = true;

        // Set initial value
        if (value) {
          quill.root.innerHTML = value;
        }

        // Handle changes
        const handleChange = () => {
          const html = quill.root.innerHTML;
          onChange(html === "<p><br></p>" ? "" : html);
        };

        changeHandlerRef.current = handleChange;
        quill.on("text-change", handleChange);
      } catch (error) {
        console.error("Failed to initialize Quill:", error);
      }
    };

    initializeQuill();

    // Cleanup
    return () => {
      isMounted = false;
    };
  }, []);

  // Update value when prop changes (if edited externally)
  useEffect(() => {
    if (
      quillRef.current &&
      value !== undefined &&
      quillRef.current.root.innerHTML !== value
    ) {
      quillRef.current.root.innerHTML = value || "";
    }
  }, [value]);

  return (
    <div
      ref={editorRef}
      className="quill-editor rounded-lg border border-slate-300 overflow-hidden bg-white"
      style={{ minHeight: "200px" }}
    />
  );
}
