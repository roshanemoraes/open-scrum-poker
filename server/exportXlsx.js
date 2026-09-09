import XLSX from 'xlsx';

export function buildWorkbook(room) {
  const rows = room.items.map((item, idx) => ({
    '#': idx + 1,
    Item: item.name,
    RCI: item.rci.final ?? '',
    Effort: item.effort.final ?? '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet['!cols'] = [{ wch: 4 }, { wch: 50 }, { wch: 10 }, { wch: 10 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sprint Poker');

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}
