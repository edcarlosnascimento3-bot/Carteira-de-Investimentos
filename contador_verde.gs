function onEdit(e) {
  const sheet = SpreadsheetApp.getActiveSheet();
  if (sheet.getName() !== "Desafio 130") return;

  const countRange = sheet.getRange("A5:AD21");
  const bgColors = countRange.getBackgrounds();
  let count = 0;

  for (let row = 0; row < bgColors.length; row++) {
    for (let col = 0; col < bgColors[0].length; col++) {
      if (bgColors[row][col].toLowerCase() === "#34a853") {
        count++;
      }
    }
  }

  sheet.getRange("B2").setValue(count);
}
