const fs = require('fs');
const path = 'c:/Users/WINDPINO/안티그래비티 프로젝트/src/components/ProductCategoryModal.jsx';
let text = fs.readFileSync(path, 'utf8');

// 1. Add ChevronUp, ChevronDown to imports if not there
if (!text.includes('ChevronUp')) {
  text = text.replace('Check, ChevronRight, AlertCircle } from', 'Check, ChevronRight, AlertCircle, ChevronUp, ChevronDown } from');
}

// 2. Add handleReorder function
if (!text.includes('const handleReorder = async')) {
  const handleReorderFunc = `
  const handleReorder = async (e, itemsList, index, direction) => {
    e.stopPropagation();
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === itemsList.length - 1)) return;
    
    // Sort items to ensure order is applied correctly
    const sortedList = [...itemsList].sort((a, b) => (a.order || 0) - (b.order || 0));
    
    // If items don't have order, assign them current index
    const listWithOrder = sortedList.map((item, i) => ({...item, order: item.order !== undefined ? item.order : i}));
    
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const currentItem = listWithOrder[index];
    const targetItem = listWithOrder[targetIndex];
    
    // Swap order
    const tempOrder = currentItem.order;
    currentItem.order = targetItem.order;
    targetItem.order = tempOrder;
    
    try {
      const companyId = currentUser?.companyId || 'default';
      const batch = writeBatch(db);
      
      batch.update(doc(db, 'companies', companyId, 'categories', String(currentItem.id)), { order: currentItem.order });
      batch.update(doc(db, 'companies', companyId, 'categories', String(targetItem.id)), { order: targetItem.order });
      
      await batch.commit();
    } catch (err) {
      console.error('Reorder error:', err);
    }
  };

`;
  const insertPoint = text.indexOf('const executeDelete = async');
  text = text.substring(0, insertPoint) + handleReorderFunc + text.substring(insertPoint);
}

// 3. Update map to include index
text = text.replace('{items.map(cat => (', '{items.map((cat, index) => (');

// 4. Inject up/down buttons
const buttonsHTML = `
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <button 
                      style={{ padding: '0', background: 'transparent', border: 'none', cursor: index === 0 ? 'default' : 'pointer', opacity: index === 0 ? 0.3 : 1, display: 'flex' }}
                      onClick={(e) => handleReorder(e, items, index, 'up')}
                      disabled={index === 0}
                    >
                      <ChevronUp size={12} color="#64748b" />
                    </button>
                    <button 
                      style={{ padding: '0', background: 'transparent', border: 'none', cursor: index === items.length - 1 ? 'default' : 'pointer', opacity: index === items.length - 1 ? 0.3 : 1, display: 'flex' }}
                      onClick={(e) => handleReorder(e, items, index, 'down')}
                      disabled={index === items.length - 1}
                    >
                      <ChevronDown size={12} color="#64748b" />
                    </button>
                  </div>
`;

if (!text.includes('handleReorder(e, items, index, \'up\')')) {
  const insertPoint2 = text.indexOf('{level < 3 && <ChevronRight size={14} color="#cbd5e1" />}');
  text = text.substring(0, insertPoint2) + buttonsHTML + text.substring(insertPoint2);
}

fs.writeFileSync(path, text, 'utf8');
console.log('Successfully added category reordering feature.');
