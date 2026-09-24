/**
 * Resolves the appropriate outgoing warehouse (vehicle or warehouse) for a given staff/manager.
 * Priority:
 * 1. staff.warehouse if found in staffList
 * 2. currentUser.warehouse if managerName matches currentUser
 * 3. warehouse named after the manager or vehicle warehouse containing manager's name
 * 4. Main warehouse (isMain === true)
 * 5. First available warehouse or fallback
 */
export const getStaffWarehouse = (managerName, staffList = [], warehouses = [], currentUser = null) => {
  const mainWH = warehouses.find(w => w.isMain)?.name ||
                 warehouses.find(w => w.name?.includes('메인'))?.name ||
                 warehouses.find(w => w.name?.includes('main'))?.name ||
                 warehouses[0]?.name ||
                 '본사창고';

  if (!managerName || managerName === '알 수 없음' || managerName === '선택안함') {
    const currentStaff = staffList.find(s => s.name === currentUser?.name || s.userId === currentUser?.userId);
    const userWH = currentUser?.warehouse || currentStaff?.warehouse;
    if (userWH && userWH !== '-') {
      const match = warehouses.find(w => w.name === userWH);
      if (match) return match.name;
      return userWH;
    }
    return mainWH;
  }

  // 1. Look up staff in staffList by name
  const staff = staffList.find(s => s.name === managerName);
  if (staff?.warehouse && staff.warehouse !== '-') {
    const match = warehouses.find(w => w.name === staff.warehouse);
    if (match) return match.name;
    return staff.warehouse;
  }

  // 2. If managerName matches currentUser, check currentUser.warehouse
  if (currentUser && (currentUser.name === managerName || currentUser.userId === managerName)) {
    if (currentUser.warehouse && currentUser.warehouse !== '-') {
      const match = warehouses.find(w => w.name === currentUser.warehouse);
      if (match) return match.name;
      return currentUser.warehouse;
    }
  }

  // 3. Look for a vehicle warehouse that belongs to this manager or contains manager's name
  const vehicleMatch = warehouses.find(w => (w.isVehicle || w.name?.includes('차량')) && w.name?.includes(managerName));
  if (vehicleMatch) return vehicleMatch.name;

  // 4. Any warehouse containing manager's name
  const nameMatch = warehouses.find(w => w.name?.includes(managerName));
  if (nameMatch) return nameMatch.name;

  // 5. Fallback to main warehouse
  return mainWH;
};
