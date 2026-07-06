const fs = require('fs');
const path = 'c:/Users/WINDPINO/안티그래비티 프로젝트/src/components/BulkEditor.jsx';
let text = fs.readFileSync(path, 'utf8');

const editableInputStart = text.indexOf('const EditableInput =');
const editableInputEnd = text.indexOf('const BulkEditor =');

const newEditableInput = `const EditableInput = ({ initialValue, onSave, onCancel, type, style, lang, inputMode, isDirectInput, isTransparent: initialIsTransparent, isBulk, onStartEdit }) => {
  const [localTransparent, setLocalTransparent] = React.useState(initialIsTransparent);
  const inputRef = React.useRef(null);
  const isComposing = React.useRef(false);

  React.useEffect(() => {
    setLocalTransparent(initialIsTransparent);
  }, [initialIsTransparent]);

  React.useEffect(() => {
    const node = inputRef.current;
    if (node) {
      node.focus();
      if (!localTransparent && !isComposing.current) {
        if (isDirectInput) {
          const len = node.value.length;
          node.setSelectionRange(len, len);
        } else {
          node.select();
        }
      }
    }
  }, [localTransparent, isDirectInput]);

  const handleMakeVisible = () => {
    if (localTransparent) {
      setLocalTransparent(false);
      if (onStartEdit) {
        setTimeout(() => {
          onStartEdit();
        }, 0);
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (isComposing.current) return;
      if (inputRef.current) {
        onSave(inputRef.current.value);
      }
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <input
      ref={inputRef}
      lang={lang}
      type="text"
      inputMode={inputMode}
      defaultValue={initialIsTransparent ? '' : initialValue}
      onCompositionStart={() => {
        isComposing.current = true;
        handleMakeVisible();
      }}
      onCompositionEnd={() => { isComposing.current = false; }}
      onInput={() => {
        handleMakeVisible();
      }}
      onKeyDown={handleKeyDown}
      onBlur={() => {
        setTimeout(() => {
          if (isComposing.current) return;
          if (!inputRef.current) return;
          if (document.activeElement === inputRef.current) return;
          
          if (localTransparent && inputRef.current.value === '') {
            onCancel();
            return;
          }
          onSave(inputRef.current.value);
        }, 100);
      }}
      className={localTransparent ? "" : "bulk-input"}
      style={{
        ...style,
        ...(localTransparent ? {
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          opacity: 0, background: 'transparent', color: 'transparent',
          zIndex: 1, border: 'none', outline: 'none', cursor: 'default', pointerEvents: 'none'
        } : (isBulk ? {
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          border: 'none', background: '#fff', boxShadow: '0 0 0 2px #3b82f6',
          outline: 'none', zIndex: 30
        } : {
          width: '100%', height: '100%', boxSizing: 'border-box'
        }))
      }}
    />
  );
};

`;

text = text.substring(0, editableInputStart) + newEditableInput + text.substring(editableInputEnd);
fs.writeFileSync(path, text, 'utf8');
console.log('Successfully updated EditableInput to fix typing issues.');
