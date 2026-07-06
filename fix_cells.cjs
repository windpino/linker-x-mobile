const fs = require('fs');
const path = 'c:/Users/WINDPINO/안티그래비티 프로젝트/src/components/BulkEditor.jsx';
let text = fs.readFileSync(path, 'utf8');

// 1. Replace EditableInput
const editableInputStart = text.indexOf('const EditableInput =');
const editableInputEnd = text.indexOf('const BulkEditor =');

const newEditableInput = `const EditableInput = ({ initialValue, onSave, onCancel, type, style, lang, inputMode, isDirectInput, isTransparent, isBulk, onStartEdit }) => {
  const inputRef = React.useRef(null);
  const isComposing = React.useRef(false);

  const setInputRef = React.useCallback((node) => {
    if (node) {
      inputRef.current = node;
      node.focus();
      if (!isTransparent) {
        if (isDirectInput) {
          const len = node.value.length;
          node.setSelectionRange(len, len);
        } else {
          node.select();
        }
      }
    }
  }, [isDirectInput, isTransparent]);

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
      defaultValue={isTransparent ? '' : initialValue}
      onCompositionStart={() => {
        isComposing.current = true;
        if (isTransparent && onStartEdit) onStartEdit();
      }}
      onCompositionEnd={() => { isComposing.current = false; }}
      onInput={() => {
        if (isTransparent && onStartEdit) onStartEdit();
      }}
      onKeyDown={handleKeyDown}
      onBlur={() => {
        setTimeout(() => {
          if (isComposing.current) return;
          if (inputRef.current && document.activeElement === inputRef.current) return;
          if (inputRef.current) {
            if (isTransparent && inputRef.current.value === '') {
              onCancel();
              return;
            }
            onSave(inputRef.current.value);
          }
        }, 100);
      }}
      className={isTransparent ? "" : "bulk-input"}
      style={{
        ...style,
        ...(isTransparent ? {
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

// 2. Replace global handleKeyDown logic (remove e.key.length === 1 block)
const globalKeydownStart = text.indexOf('      // Start edit on printable character keys (including space)');
const globalKeydownEnd = text.indexOf('      // Delete/Backspace for range or single cell');

text = text.substring(0, globalKeydownStart) + text.substring(globalKeydownEnd);

// 3. Replace cell render logic
const cellRenderStart = text.indexOf('{isEditing && col.type !== \'boolean\' ? (');
const cellRenderEnd = text.indexOf('</td>', cellRenderStart);

const newCellRender = `
                        {(() => {
                          const isAnchorCell = isSelected && rIdx === startRow && cIdx === startCol;
                          const shouldRenderInput = (isEditing || isFirstSelected || isAnchorCell) && col.type !== 'boolean';
                          const isActiveEdit = isEditing || isFirstSelected;
                          
                          return (
                            <>
                              {shouldRenderInput && (
                                <EditableInput
                                  initialValue={isFirstSelected ? bulkInputValue : (isEditing ? (row[col.field] || '') : '')}
                                  isDirectInput={isActiveEdit ? (isFirstSelected || editingCell?.isDirectInput) : true}
                                  isTransparent={!isActiveEdit}
                                  isBulk={isFirstSelected}
                                  onStartEdit={() => {
                                    if (!isActiveEdit) {
                                      const isRange = startRow !== Math.max(r1, r2) || startCol !== Math.max(c1, c2);
                                      if (isRange) {
                                        setIsBulkInputActive(true);
                                      } else {
                                        setEditingCell({ r: rIdx, c: cIdx, isDirectInput: true });
                                      }
                                    }
                                  }}
                                  onSave={(val) => {
                                    if (isFirstSelected) {
                                      handleBulkInputChange(val);
                                      setIsBulkInputActive(false);
                                    } else {
                                      handleChange(rIdx, col.field, col.type === 'number' ? Number(val) || 0 : val);
                                      handleEnterNavigation(rIdx, cIdx);
                                      setEditingCell(null);
                                    }
                                  }}
                                  onCancel={() => {
                                    if (isFirstSelected) setIsBulkInputActive(false);
                                    else setEditingCell(null);
                                  }}
                                  type={col.type}
                                  lang="ko"
                                  inputMode={col.type === 'number' ? 'numeric' : 'text'}
                                  style={{
                                    textAlign: col.type === 'number' ? 'right' : 'left',
                                    imeMode: 'active'
                                  }}
                                />
                              )}
                              {(!shouldRenderInput || !isActiveEdit) && (
                                <div className="cell-display" style={{ justifyContent: col.type === 'number' ? 'flex-end' : 'center', pointerEvents: isAnchorCell ? 'none' : 'auto' }}>
                                  {col.type === 'boolean' ? (
                                    <input
                                      type="checkbox"
                                      checked={row[col.field] !== false}
                                      onChange={(e) => handleChange(rIdx, col.field, e.target.checked)}
                                    />
                                  ) : col.type === 'number' ? (
                                    Number(row[col.field] || 0).toLocaleString()
                                  ) : (
                                    row[col.field] || ''
                                  )}
                                </div>
                              )}
                            </>
                          );
                        })()}
                      `;

text = text.substring(0, cellRenderStart) + newCellRender + '\n' + text.substring(cellRenderEnd);

fs.writeFileSync(path, text, 'utf8');
console.log('Successfully updated cell rendering and inputs');
