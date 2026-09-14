import XLSX from 'xlsx';

export function buildWorkbook(room) {
  const pollTypes = Object.entries(room.config.polls);

  const rows = room.items.map((item, idx) => {
    const row = { '#': idx + 1, Item: item.name };
    for (const [type, poll] of pollTypes) {
      row[poll.label] = item[type]?.final ?? '';
    }
    return row;
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet['!cols'] = [{ wch: 4 }, { wch: 50 }, ...pollTypes.map(() => ({ wch: 10 }))];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sprint Poker');

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}
