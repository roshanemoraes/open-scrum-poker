import ExcelJS from 'exceljs';

export async function buildWorkbook(room) {
  const pollTypes = Object.entries(room.config.polls);

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Sprint Poker');

  worksheet.columns = [
    { header: '#', key: '#', width: 4 },
    { header: 'Item', key: 'Item', width: 50 },
    ...pollTypes.map(([, poll]) => ({ header: poll.label, key: poll.label, width: 10 })),
  ];

  room.items.forEach((item, idx) => {
    const row = { '#': idx + 1, Item: item.name };
    for (const [type, poll] of pollTypes) {
      row[poll.label] = item[type]?.final ?? '';
    }
    worksheet.addRow(row);
  });

  return workbook.xlsx.writeBuffer();
}
