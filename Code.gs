/**
 * Employee Work Hours Dashboard - Apps Script Backend
 * Serves the HTML frontend and interfaces with Google Sheets.
 */

function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Employee Work Hours Dashboard')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Creates a custom menu in the Google Sheet when it is opened.
 * This allows launching the dashboard directly inside the spreadsheet UI.
 */
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('לוח בקרה')
    .addItem('פתח לוח בקרה (Sidebar)', 'openSidebar')
    .addItem('פתח לוח בקרה (חלון מלא)', 'openModalDialog')
    .addToUi();
}

/**
 * Opens the dashboard as a sidebar inside the spreadsheet
 */
function openSidebar() {
  var html = HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Employee Work Hours Dashboard');
  SpreadsheetApp.getUi().showSidebar(html);
}

/**
 * Opens the dashboard as a large modal dialog inside the spreadsheet
 */
function openModalDialog() {
  var html = HtmlService.createHtmlOutputFromFile('Index')
    .setWidth(1200)
    .setHeight(850)
    .setTitle('Employee Work Hours Dashboard');
  SpreadsheetApp.getUi().showModalDialog(html, 'Employee Work Hours Dashboard');
}

/**
 * Gets the spreadsheet to read/write data from.
 */
function getSpreadsheet() {
  var ssContainer = SpreadsheetApp.getActiveSpreadsheet();
  var settingsSheet = ssContainer.getSheetByName('Settings');
  if (!settingsSheet) {
    initContainerSheets(ssContainer);
    settingsSheet = ssContainer.getSheetByName('Settings');
  }
  
  var settingsData = settingsSheet.getDataRange().getValues();
  var targetLink = '';
  for (var i = 1; i < settingsData.length; i++) {
    if (settingsData[i][0] === 'TargetSpreadsheetLink') {
      targetLink = String(settingsData[i][1]).trim();
      break;
    }
  }
  
  if (targetLink) {
    try {
      if (targetLink.indexOf('docs.google.com') !== -1) {
        return SpreadsheetApp.openByUrl(targetLink);
      } else {
        return SpreadsheetApp.openById(targetLink);
      }
    } catch (e) {
      Logger.log('Could not open target spreadsheet: ' + e.message);
    }
  }
  return ssContainer;
}

/**
 * Initialize settings on the main container sheet itself
 */
function initContainerSheets(ss) {
  var settingsSheet = ss.getSheetByName('Settings');
  if (!settingsSheet) {
    settingsSheet = ss.insertSheet('Settings');
    settingsSheet.appendRow(['Setting Key', 'Value', 'Description']);
    settingsSheet.appendRow(['StandardHoursPerDay', '9.0', 'Standard working hours per day']);
    settingsSheet.appendRow(['AnnualVacationAllowance', '21.0', 'Annual vacation allowance (in days)']);
    settingsSheet.appendRow(['VacationUsedThisMonth', '5.0', 'Vacation days used this month']);
    settingsSheet.appendRow(['ReserveDutyDays', '0.0', 'Reserve duty / illness days this month']);
    settingsSheet.appendRow(['TargetSpreadsheetLink', '', 'Google Sheet ID or URL to link to']);
    settingsSheet.getRange('A1:C1').setFontWeight('bold').setBackground('#f3f3f3');
  }
}

/**
 * Initialize sheets on the target spreadsheet if they do not exist
 */
function initSheets(ss) {
  if (!ss) {
    ss = getSpreadsheet();
  }
  
  // 1. Settings Sheet
  var settingsSheet = ss.getSheetByName('Settings');
  if (!settingsSheet) {
    settingsSheet = ss.insertSheet('Settings');
    settingsSheet.appendRow(['Setting Key', 'Value', 'Description']);
    settingsSheet.appendRow(['StandardHoursPerDay', '9.0', 'Standard working hours per day']);
    settingsSheet.appendRow(['AnnualVacationAllowance', '21.0', 'Annual vacation allowance (in days)']);
    settingsSheet.appendRow(['VacationUsedThisMonth', '5.0', 'Vacation days used this month']);
    settingsSheet.appendRow(['ReserveDutyDays', '0.0', 'Reserve duty / illness days this month']);
    settingsSheet.appendRow(['NonWorkingDaysOfWeek', '5,6', 'Non-working days of the week (0=Sun..6=Sat)']);
    settingsSheet.appendRow(['TargetSpreadsheetLink', '', 'Google Sheet ID or URL to link to']);
    settingsSheet.getRange('A1:C1').setFontWeight('bold').setBackground('#f3f3f3');
  } else {
    // Migration: make sure keys exist
    var data = settingsSheet.getDataRange().getValues();
    var keys = {};
    for (var i = 1; i < data.length; i++) {
      keys[data[i][0]] = true;
    }
    if (!keys['StandardHoursPerDay']) {
      settingsSheet.appendRow(['StandardHoursPerDay', '9.0', 'Standard working hours per day']);
    }
    if (!keys['AnnualVacationAllowance']) {
      settingsSheet.appendRow(['AnnualVacationAllowance', '21.0', 'Annual vacation allowance (in days)']);
    }
    if (!keys['NonWorkingDaysOfWeek']) {
      settingsSheet.appendRow(['NonWorkingDaysOfWeek', '5,6', 'Non-working days of the week (0=Sun..6=Sat)']);
    }
    if (!keys['TargetSpreadsheetLink']) {
      settingsSheet.appendRow(['TargetSpreadsheetLink', '', 'Google Sheet ID or URL to link to']);
    }
  }
  
  // 2. WorkdayStandards Sheet (stores monthly standards per year)
  var standardSheet = ss.getSheetByName('WorkdayStandards');
  if (!standardSheet) {
    standardSheet = ss.insertSheet('WorkdayStandards');
    standardSheet.appendRow(['Year', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']);
    standardSheet.getRange('A1:M1').setFontWeight('bold').setBackground('#f3f3f3');
    
    // Add default row for 2026
    standardSheet.appendRow([2026, 21, 20, 23, 22, 21, 22, 22, 22, 22, 21, 22, 23]);
    standardSheet.appendRow([2027, 22, 20, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22]);
  }
  
  // 3. Reports Sheet tab: named "דיווח שעות" (Hebrew headers)
  var reportsSheet = ss.getSheetByName('דיווח שעות');
  if (!reportsSheet) {
    reportsSheet = ss.insertSheet('דיווח שעות');
    reportsSheet.appendRow(['תאריך', 'שעת התחלה', 'שעת סיום', 'סה"כ שעות', 'סוג', 'הערות', 'Timestamp']);
    reportsSheet.getRange('A1:G1').setFontWeight('bold').setBackground('#f3f3f3');
    
    var today = new Date();
    var sampleYear = today.getFullYear();
    var sampleMonth = today.getMonth() + 1; // 1-indexed
    
    reportsSheet.appendRow([sampleYear + '-' + padZero(sampleMonth) + '-01', '07:30', '16:00', '8.5', 'עבודה', 'Initial project setup', new Date()]);
    reportsSheet.appendRow([sampleYear + '-' + padZero(sampleMonth) + '-02', '07:30', '16:30', '9.0', 'עבודה', 'Frontend development', new Date()]);
    reportsSheet.appendRow([sampleYear + '-' + padZero(sampleMonth) + '-05', '06:57', '17:07', '10.2', 'עבודה', 'Backend integration & testing', new Date()]);
  } else {
    // Check if header row exists, if not write it in row 1
    var firstCell = reportsSheet.getRange(1, 1).getValue();
    if (String(firstCell).trim() !== 'תאריך') {
      reportsSheet.insertRowBefore(1);
      reportsSheet.getRange('A1:G1').setValues([['תאריך', 'שעת התחלה', 'שעת סיום', 'סה"כ שעות', 'סוג', 'הערות', 'Timestamp']]);
      reportsSheet.getRange('A1:G1').setFontWeight('bold').setBackground('#f3f3f3');
    }
  }
}

function padZero(num) {
  return num < 10 ? '0' + num : num;
}

/**
 * Parses diverse date formats from Google Sheets into "YYYY-MM-DD"
 */
function parseSheetDate(rawDate) {
  if (rawDate instanceof Date) {
    return rawDate.getFullYear() + '-' + padZero(rawDate.getMonth() + 1) + '-' + padZero(rawDate.getDate());
  }
  
  var dateStr = String(rawDate).trim();
  if (!dateStr) return '';
  
  // Format DD.MM.YYYY
  if (dateStr.indexOf('.') !== -1) {
    var parts = dateStr.split('.');
    if (parts.length === 3) {
      var day = parts[0].trim();
      var month = parts[1].trim();
      var year = parts[2].trim();
      if (day.length === 1) day = '0' + day;
      if (month.length === 1) month = '0' + month;
      if (year.length === 2) year = '20' + year;
      return year + '-' + month + '-' + day;
    }
  }
  
  // Format DD/MM/YYYY
  if (dateStr.indexOf('/') !== -1) {
    var parts = dateStr.split('/');
    if (parts.length === 3) {
      var day = parts[0].trim();
      var month = parts[1].trim();
      var year = parts[2].trim();
      if (day.length === 1) day = '0' + day;
      if (month.length === 1) month = '0' + month;
      if (year.length === 2) year = '20' + year;
      return year + '-' + month + '-' + day;
    }
  }
  
  return dateStr;
}

/**
 * Get all dashboard data: settings, reports for selected month, aggregates.
 * @param {string} monthStr - Format "YYYY-MM", defaults to current month.
 */
function getDashboardData(monthStr) {
  var ssTarget = getSpreadsheet();
  initSheets(ssTarget);
  
  var spreadsheetUrl = ssTarget.getUrl();
  
  // Read Settings from target
  var settingsSheet = ssTarget.getSheetByName('Settings');
  var settingsData = settingsSheet.getDataRange().getValues();
  var settings = {};
  for (var i = 1; i < settingsData.length; i++) {
    var val = settingsData[i][1];
    if (settingsData[i][0] === 'NonWorkingDaysOfWeek') {
      settings[settingsData[i][0]] = String(val).split(',').map(Number);
    } else {
      settings[settingsData[i][0]] = isNaN(val) || val === '' ? val : parseFloat(val);
    }
  }
  if (!settings['NonWorkingDaysOfWeek']) {
    settings['NonWorkingDaysOfWeek'] = [5, 6];
  }
  var nonWorkingDays = settings['NonWorkingDaysOfWeek'];
  
  // Also read TargetSpreadsheetLink from the container sheet
  var ssContainer = SpreadsheetApp.getActiveSpreadsheet();
  var containerSettingsSheet = ssContainer.getSheetByName('Settings');
  if (containerSettingsSheet) {
    var containerData = containerSettingsSheet.getDataRange().getValues();
    for (var i = 1; i < containerData.length; i++) {
      if (containerData[i][0] === 'TargetSpreadsheetLink') {
        settings['TargetSpreadsheetLink'] = String(containerData[i][1]);
        break;
      }
    }
  }
  if (!settings['TargetSpreadsheetLink']) {
    settings['TargetSpreadsheetLink'] = '';
  }
  
  if (!monthStr) {
    var today = new Date();
    monthStr = today.getFullYear() + '-' + padZero(today.getMonth() + 1);
  }
  var year = parseInt(monthStr.split('-')[0]);
  var month = parseInt(monthStr.split('-')[1]) - 1; // 0-indexed
  
  // Read WorkdayStandards sheet
  var standardsSheet = ssTarget.getSheetByName('WorkdayStandards');
  var standardsData = standardsSheet.getDataRange().getValues();
  var workdaysMap = {};
  var availableYears = [];
  
  for (var k = 1; k < standardsData.length; k++) {
    var row = standardsData[k];
    var y = parseInt(row[0]);
    availableYears.push(y);
    workdaysMap[y] = row.slice(1).map(Number);
  }
  
  var monthlyStandardDays = getWorkDaysCount(year, month, nonWorkingDays);
  if (workdaysMap[year] && workdaysMap[year][month] !== undefined) {
    monthlyStandardDays = workdaysMap[year][month];
  }
  
  var dailyStdHours = parseFloat(settings['StandardHoursPerDay']) || 9.0;
  var calculatedTargetHours = monthlyStandardDays * dailyStdHours;
  
  // Read Reports
  var reportsSheet = ssTarget.getSheetByName('דיווח שעות');
  var reportsData = reportsSheet.getDataRange().getValues();
  
  var monthlyReports = [];
  var totalReportedHours = 0;
  var dailyHoursMap = {};
  var daysInMonth = new Date(year, month + 1, 0).getDate();
  for (var d = 1; d <= daysInMonth; d++) {
    dailyHoursMap[d] = 0;
  }
  
  function mapCategory(val) {
    var s = String(val || '').trim();
    if (s === 'עבודה' || s === 'עבודה בפועל' || s === 'Work') return 'Work';
    if (s === 'חופש' || s === 'יום חופש' || s === 'Vacation') return 'Vacation';
    if (s === 'מחלה' || s === 'חופשת מחלה' || s === 'Sick') return 'Sick';
    if (s === 'מילואים' || s === 'שירות מילואים' || s === 'Reserve') return 'Reserve';
    return 'Work';
  }
  
  for (var j = 1; j < reportsData.length; j++) {
    var row = reportsData[j];
    var rawDate = row[0];
    if (!rawDate) continue;
    
    var dateStr = parseSheetDate(rawDate);
    
    if (dateStr.indexOf(monthStr) === 0) {
      var startTime = String(row[1] || '');
      var endTime = String(row[2] || '');
      var hours = parseFloat(row[3]) || 0;
      var category = mapCategory(row[4]);
      var notes = row[5];
      var day = parseInt(dateStr.split('-')[2]);
      
      monthlyReports.push({
        date: dateStr,
        day: day,
        startTime: startTime,
        endTime: endTime,
        hours: hours,
        category: category,
        notes: notes
      });
      
      totalReportedHours += hours;
      dailyHoursMap[day] = (dailyHoursMap[day] || 0) + hours;
    }
  }
  
  // Calculate fully updated weekdays (only days with clockin and clockout on working days)
  var updatedFullyDays = 0;
  for (var j = 1; j < reportsData.length; j++) {
    var row = reportsData[j];
    var rawDate = row[0];
    if (!rawDate) continue;
    
    var dateStr = parseSheetDate(rawDate);
    if (dateStr.indexOf(monthStr) === 0) {
      var startTime = String(row[1] || '').trim();
      var endTime = String(row[2] || '').trim();
      
      var dParts = dateStr.split('-');
      var dayOfWeek = new Date(parseInt(dParts[0], 10), parseInt(dParts[1], 10) - 1, parseInt(dParts[2], 10)).getDay();
      var isWorkday = (nonWorkingDays.indexOf(dayOfWeek) === -1);
      
      if (isWorkday) {
        if (startTime && endTime) {
          updatedFullyDays++;
        }
      }
    }
  }

  var remainingHours = Math.max(0, calculatedTargetHours - totalReportedHours);
  var remainingWorkDays = Math.max(0, monthlyStandardDays - updatedFullyDays);
  var dailyForecast = remainingWorkDays > 0 ? (remainingHours / remainingWorkDays) : 0;
  
  // Find first year and first month with reports data
  var firstYear = year;
  var firstMonth = month + 1; // 1-indexed (default to current viewed month)
  var minDateStr = '';
  
  for (var j = 1; j < reportsData.length; j++) {
    var row = reportsData[j];
    var rawDate = row[0];
    if (!rawDate) continue;
    var dateStr = parseSheetDate(rawDate);
    if (!minDateStr || dateStr < minDateStr) {
      minDateStr = dateStr;
    }
  }
  if (minDateStr) {
    firstYear = parseInt(minDateStr.split('-')[0], 10);
    firstMonth = parseInt(minDateStr.split('-')[1], 10);
  }

  var totalVacationUsedAllYear = 0; // vacation used this year (full year)
  var totalVacationUsedYtd = 0;     // vacation used this year (YTD to viewed month)
  var usedBeforeSelectedYear = 0;   // vacation used in all years prior to viewed year
  
  var lastDay = new Date(year, month + 1, 0).getDate();
  var endOfMonthStr = year + '-' + padZero(month + 1) + '-' + padZero(lastDay);

  for (var j = 1; j < reportsData.length; j++) {
    var row = reportsData[j];
    var rawDate = row[0];
    if (!rawDate) continue;
    
    var dateStr = parseSheetDate(rawDate);
    var rowYear = parseInt(dateStr.split('-')[0], 10);
    if (!rowYear) continue;
    
    var category = mapCategory(row[4]);
    if (category === 'Vacation') {
      if (rowYear < year) {
        usedBeforeSelectedYear += 1.0;
      } else if (rowYear === year) {
        totalVacationUsedAllYear += 1.0;
        if (dateStr <= endOfMonthStr) {
          totalVacationUsedYtd += 1.0;
        }
      }
    }
  }

  var annualVacationAllowance = parseFloat(settings['AnnualVacationAllowance']) || 21.0;
  var monthlyAccrualRate = annualVacationAllowance / 12;

  // Accrued quota from start to selected month inclusive
  var elapsedMonths = (year - firstYear) * 12 + ((month + 1) - firstMonth) + 1;
  var totalAccumulatedQuotaForThisMonth = elapsedMonths * monthlyAccrualRate;

  var totalUsedSinceStartOfData = usedBeforeSelectedYear + totalVacationUsedYtd;
  var vacationBalance = Math.round((totalAccumulatedQuotaForThisMonth - totalUsedSinceStartOfData) * 10) / 10;

  // Year-end estimate calculation
  var elapsedMonthsYearEnd = (year - firstYear) * 12 + (12 - firstMonth) + 1;
  var totalAccumulatedQuotaYearEnd = elapsedMonthsYearEnd * monthlyAccrualRate;
  var totalUsedYearEnd = usedBeforeSelectedYear + totalVacationUsedAllYear;
  var estimatedVacationBalanceYearEnd = Math.round((totalAccumulatedQuotaYearEnd - totalUsedYearEnd) * 10) / 10;

  return {
    settings: settings,
    reports: monthlyReports,
    dailyHours: dailyHoursMap,
    daysInMonth: daysInMonth,
    workdaysMap: workdaysMap,
    availableYears: availableYears.sort(),
    spreadsheetUrl: spreadsheetUrl,
    stats: {
      targetHours: calculatedTargetHours,
      reportedHours: totalReportedHours,
      remainingHours: remainingHours,
      potentialWorkDays: monthlyStandardDays,
      remainingWorkDays: remainingWorkDays,
      dailyForecast: dailyForecast,
      vacationBalance: vacationBalance,
      estimatedVacationBalanceYearEnd: estimatedVacationBalanceYearEnd
    }
  };
}

/**
 * Add or Update an hours report (Upsert)
 */
function addReport(dateStr, startTime, endTime, hours, category, notes) {
  var ssTarget = getSpreadsheet();
  initSheets(ssTarget);
  var reportsSheet = ssTarget.getSheetByName('דיווח שעות');
  var reportsData = reportsSheet.getDataRange().getValues();
  var existingRowIdx = -1;
  
  for (var i = 1; i < reportsData.length; i++) {
    var rowDate = reportsData[i][0];
    if (!rowDate) continue;
    
    var formattedRowDate = parseSheetDate(rowDate);
    
    if (formattedRowDate === dateStr) {
      existingRowIdx = i + 1;
      break;
    }
  }
  
  function getHebrewCategory(engVal) {
    if (engVal === 'Work') return 'עבודה';
    if (engVal === 'Vacation') return 'חופש';
    if (engVal === 'Sick') return 'מחלה';
    if (engVal === 'Reserve') return 'מילואים';
    return 'עבודה';
  }
  
  var newRowData = [
    dateStr,
    startTime || '',
    endTime || '',
    parseFloat(hours),
    getHebrewCategory(category),
    notes || '',
    new Date()
  ];
  
  if (existingRowIdx !== -1) {
    reportsSheet.getRange(existingRowIdx, 1, 1, 7).setValues([newRowData]);
  } else {
    reportsSheet.appendRow(newRowData);
  }
  
  var monthStr = dateStr.substring(0, 7);
  return getDashboardData(monthStr);
}

/**
 * Update several reports at once (Bulk Update)
 * If there is existing data in a report, we update only the fields specified in fieldsToUpdate.
 * @param {Array<Object>} reportsBatch - Array of { date, startTime, endTime, hours, category, notes }
 * @param {Array<string>} fieldsToUpdate - Fields that the user checked for updating (e.g. ['startTime', 'endTime', 'category', 'notes'])
 */
function updateReportsBatch(reportsBatch, fieldsToUpdate) {
  if (!reportsBatch || reportsBatch.length === 0) return getDashboardData();
  
  var ssTarget = getSpreadsheet();
  initSheets(ssTarget);
  var reportsSheet = ssTarget.getSheetByName('דיווח שעות');
  var reportsData = reportsSheet.getDataRange().getValues();
  
  // Create a map of date to row index (1-based index)
  var dateRowMap = {};
  for (var i = 1; i < reportsData.length; i++) {
    var rowDate = reportsData[i][0];
    if (rowDate) {
      dateRowMap[parseSheetDate(rowDate)] = i + 1;
    }
  }
  
  function getHebrewCategory(engVal) {
    if (engVal === 'Work') return 'עבודה';
    if (engVal === 'Vacation') return 'חופש';
    if (engVal === 'Sick') return 'מחלה';
    if (engVal === 'Reserve') return 'מילואים';
    return 'עבודה';
  }
  
  var fieldsSet = {};
  for (var f = 0; f < fieldsToUpdate.length; f++) {
    fieldsSet[fieldsToUpdate[f]] = true;
  }
  
  for (var k = 0; k < reportsBatch.length; k++) {
    var updateItem = reportsBatch[k];
    var dateStr = updateItem.date;
    var existingRowIdx = dateRowMap[dateStr];
    
    var currentRecord = {
      date: dateStr,
      startTime: '',
      endTime: '',
      hours: 0.0,
      category: 'עבודה',
      notes: ''
    };
    
    if (existingRowIdx) {
      var rowValues = reportsSheet.getRange(existingRowIdx, 1, 1, 6).getValues()[0];
      currentRecord.startTime = String(rowValues[1] || '');
      currentRecord.endTime = String(rowValues[2] || '');
      currentRecord.hours = parseFloat(rowValues[3]) || 0.0;
      currentRecord.category = String(rowValues[4] || 'עבודה');
      currentRecord.notes = String(rowValues[5] || '');
    }
    
    // Apply updates only for selected fields
    if (fieldsSet['startTime']) {
      currentRecord.startTime = updateItem.startTime || '';
    }
    if (fieldsSet['endTime']) {
      currentRecord.endTime = updateItem.endTime || '';
    }
    // If times are updated, recalculate hours unless hours itself is explicitly selected
    if (fieldsSet['startTime'] || fieldsSet['endTime']) {
      if (currentRecord.startTime && currentRecord.endTime) {
        var startParts = currentRecord.startTime.split(':');
        var endParts = currentRecord.endTime.split(':');
        if (startParts.length === 2 && endParts.length === 2) {
          var startMin = parseInt(startParts[0], 10) * 60 + parseInt(startParts[1], 10);
          var endMin = parseInt(endParts[0], 10) * 60 + parseInt(endParts[1], 10);
          var diff = endMin - startMin;
          currentRecord.hours = diff > 0 ? parseFloat((diff / 60).toFixed(1)) : 0.0;
        } else {
          currentRecord.hours = 0.0;
        }
      } else {
        currentRecord.hours = 0.0;
      }
    }
    
    if (fieldsSet['hours']) {
      currentRecord.hours = parseFloat(updateItem.hours) || 0.0;
    }
    if (fieldsSet['category']) {
      currentRecord.category = getHebrewCategory(updateItem.category);
    }
    if (fieldsSet['notes']) {
      currentRecord.notes = updateItem.notes || '';
    }
    
    // Write back to sheet
    var newRowData = [
      currentRecord.date,
      currentRecord.startTime,
      currentRecord.endTime,
      currentRecord.hours,
      currentRecord.category,
      currentRecord.notes,
      new Date() // Timestamp
    ];
    
    if (existingRowIdx) {
      reportsSheet.getRange(existingRowIdx, 1, 1, 7).setValues([newRowData]);
    } else {
      reportsSheet.appendRow(newRowData);
      // Update our map and sheet data in case we have sequential writes (e.g. duplicating same date in batch)
      reportsData = reportsSheet.getDataRange().getValues();
      dateRowMap[dateStr] = reportsData.length;
    }
  }
  
  var monthStr = reportsBatch[0].date.substring(0, 7);
  return getDashboardData(monthStr);
}

/**
 * Clear/delete a report for a specific date
 */
function clearReport(dateStr) {
  var ssTarget = getSpreadsheet();
  initSheets(ssTarget);
  var reportsSheet = ssTarget.getSheetByName('דיווח שעות');
  var reportsData = reportsSheet.getDataRange().getValues();
  
  for (var i = 1; i < reportsData.length; i++) {
    var rowDate = reportsData[i][0];
    if (!rowDate) continue;
    
    var formattedRowDate = parseSheetDate(rowDate);
    
    if (formattedRowDate === dateStr) {
      reportsSheet.deleteRow(i + 1);
      break;
    }
  }
  
  var monthStr = dateStr.substring(0, 7);
  return getDashboardData(monthStr);
}

/**
 * Save workday standard and vacation configurations
 */
function saveWorkdaySettings(selectedYear, annualAllowance, standardHours, workdayArray, targetLink, nonWorkingDays) {
  var ssContainer = SpreadsheetApp.getActiveSpreadsheet();
  initContainerSheets(ssContainer);
  var containerSettingsSheet = ssContainer.getSheetByName('Settings');
  var containerData = containerSettingsSheet.getDataRange().getValues();
  
  var linkRowIdx = -1;
  for (var i = 1; i < containerData.length; i++) {
    if (containerData[i][0] === 'TargetSpreadsheetLink') {
      linkRowIdx = i + 1;
      break;
    }
  }
  if (linkRowIdx !== -1) {
    containerSettingsSheet.getRange(linkRowIdx, 2).setValue(targetLink || '');
  } else {
    containerSettingsSheet.appendRow(['TargetSpreadsheetLink', targetLink || '', 'Google Sheet ID or URL to link to']);
  }
  
  var ssTarget = getSpreadsheet();
  initSheets(ssTarget);
  
  var settingsSheet = ssTarget.getSheetByName('Settings');
  var settingsData = settingsSheet.getDataRange().getValues();
  var keys = ['AnnualVacationAllowance', 'StandardHoursPerDay'];
  var vals = [annualAllowance, standardHours];
  if (nonWorkingDays && Array.isArray(nonWorkingDays)) {
    keys.push('NonWorkingDaysOfWeek');
    vals.push(nonWorkingDays.join(','));
  }
  
  for (var k = 0; k < keys.length; k++) {
    var key = keys[k];
    var val = vals[k];
    var rowIdx = -1;
    for (var r = 1; r < settingsData.length; r++) {
      if (settingsData[r][0] === key) {
        rowIdx = r + 1;
        break;
      }
    }
    if (rowIdx !== -1) {
      settingsSheet.getRange(rowIdx, 2).setValue(val);
    } else {
      settingsSheet.appendRow([key, val, '']);
    }
  }
  
  var standardsSheet = ssTarget.getSheetByName('WorkdayStandards');
  var standardsData = standardsSheet.getDataRange().getValues();
  var targetRowIdx = -1;
  
  for (var j = 1; j < standardsData.length; j++) {
    if (parseInt(standardsData[j][0]) === parseInt(selectedYear)) {
      targetRowIdx = j + 1;
      break;
    }
  }
  
  var newRowData = [selectedYear].concat(workdayArray.map(Number));
  
  if (targetRowIdx !== -1) {
    standardsSheet.getRange(targetRowIdx, 1, 1, 13).setValues([newRowData]);
  } else {
    standardsSheet.appendRow(newRowData);
  }
  
  return getDashboardData();
}

/**
 * Legacy configuration updates
 */
function updateSettings(targetHours, totalVacation, vacationUsed, reserveDuty, targetLink) {
  var ssContainer = SpreadsheetApp.getActiveSpreadsheet();
  initContainerSheets(ssContainer);
  var containerSettingsSheet = ssContainer.getSheetByName('Settings');
  var containerData = containerSettingsSheet.getDataRange().getValues();
  var linkRowIdx = -1;
  for (var i = 1; i < containerData.length; i++) {
    if (containerData[i][0] === 'TargetSpreadsheetLink') {
      linkRowIdx = i + 1;
      break;
    }
  }
  if (linkRowIdx !== -1) {
    containerSettingsSheet.getRange(linkRowIdx, 2).setValue(targetLink || '');
  }
  
  var ssTarget = getSpreadsheet();
  initSheets(ssTarget);
  var targetSettingsSheet = ssTarget.getSheetByName('Settings');
  var targetData = targetSettingsSheet.getDataRange().getValues();
  
  var keys = ['VacationUsedThisMonth', 'ReserveDutyDays', 'AnnualVacationAllowance'];
  var vals = [vacationUsed, reserveDuty, totalVacation];
  
  for (var k = 0; k < keys.length; k++) {
    var key = keys[k];
    var val = vals[k];
    var rowIdx = -1;
    for (var r = 1; r < targetData.length; r++) {
      if (targetData[r][0] === key) {
        rowIdx = r + 1;
        break;
      }
    }
    if (rowIdx !== -1) {
      targetSettingsSheet.getRange(rowIdx, 2).setValue(parseFloat(val) || 0);
    }
  }
  
  return getDashboardData();
}

/**
 * Helpers to calculate work days (excluding configured non-working days)
 */
function getWorkDaysCount(year, month, nonWorkingDays) {
  if (!nonWorkingDays) nonWorkingDays = [5, 6];
  var days = new Date(year, month + 1, 0).getDate();
  var count = 0;
  for (var d = 1; d <= days; d++) {
    var dayOfWeek = new Date(year, month, d).getDay();
    if (nonWorkingDays.indexOf(dayOfWeek) === -1) {
      count++;
    }
  }
  return count;
}

function getRemainingWorkDaysCount(year, month, nonWorkingDays) {
  if (!nonWorkingDays) nonWorkingDays = [5, 6];
  var today = new Date();
  if (today.getFullYear() > year || (today.getFullYear() === year && today.getMonth() > month)) {
    return 0;
  }
  if (today.getFullYear() < year || (today.getFullYear() === year && today.getMonth() < month)) {
    return getWorkDaysCount(year, month, nonWorkingDays);
  }
  
  var days = new Date(year, month + 1, 0).getDate();
  var startDay = today.getDate();
  var count = 0;
  for (var d = startDay; d <= days; d++) {
    var dayOfWeek = new Date(year, month, d).getDay();
    if (nonWorkingDays.indexOf(dayOfWeek) === -1) {
      count++;
    }
  }
  return count;
}

