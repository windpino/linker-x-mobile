const fs = require('fs');
const path = 'c:/Users/WINDPINO/안티그래비티 프로젝트/src/components/BulkEditor.jsx';
let text = fs.readFileSync(path, 'utf8');

const startStr = 'const CHO_LIST =';
const endStr = 'const BulkEditor =';

const start = text.indexOf(startStr);
const end = text.indexOf(endStr);

if (start >= 0 && end > start) {
  const replacement = `const EditableInput = ({ initialValue, onSave, onCancel, type, style, lang, inputMode, isDirectInput, pendingChar }) => {
  const inputRef = React.useRef(null);
  const isComposing = React.useRef(false);

  const setInputRef = React.useCallback((node) => {
    if (node) {
      inputRef.current = node;
      node.focus();
      if (isDirectInput) {
        const len = node.value.length;
        node.setSelectionRange(len, len);
      } else {
        node.select();
      }
    }
  }, [isDirectInput]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (isComposing.current) return;
      onSave(inputRef.current.value);
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <input
      ref={setInputRef}
      lang={lang}
      type="text"
      inputMode={inputMode}
      defaultValue={isDirectInput ? (pendingChar || '') : initialValue}
      onCompositionStart={() => { isComposing.current = true; }}
      onCompositionEnd={() => { isComposing.current = false; }}
      onKeyDown={handleKeyDown}
      onBlur={() => {
        setTimeout(() => {
          if (isComposing.current) return;
          if (inputRef.current && document.activeElement === inputRef.current) return;
          if (inputRef.current) onSave(inputRef.current.value);
        }, 100);
      }}
      className="bulk-input"
      style={style}
    />
  );
};

`;
  text = text.substring(0, start) + replacement + text.substring(end);
  fs.writeFileSync(path, text, 'utf8');
  console.log('Successfully replaced');
} else {
  console.log('Could not find start/end markers');
}
