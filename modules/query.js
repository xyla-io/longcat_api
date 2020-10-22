
// TODO properly escape anything in an 'like'/'ilike' statement
// https://www.npmjs.com/package/pg-escape

const columnOperators = {
  is_null: (col) => `${col} is null`,
  is_not_null: (col) => `${col} is not null`,
  equal: (col, val) => `${col} = ${formatValue(val)}`,
  not_equal: (col, val) => `${col} <> ${formatValue(val)}`,
  less_than: (col, val) => `${col} < ${formatValue(val)}`,
  less_than_or_equal: (col, val) => `${col} <= ${formatValue(val)}`,
  greater_than: (col, val) => `${col} > ${formatValue(val)}`,
  greater_than_or_equal: (col, val) => `${col} >= ${formatValue(val)}`,
  contains: (col, val, { caseSensitive }={}) => `${col} ${caseSensitive ? '' : 'i'}like '%${val}%'`, 
  starts_with: (col, val, { caseSensitive }={}) => `${col} ${caseSensitive ? '' : 'i'}like '${val}%'`, 
  ends_with: (col, val, { caseSensitive }={}) => `${col} ${caseSensitive ? '' : 'i'}like '%${val}'`, 
};

function formatValue(value) {
  if (typeof value === 'number') {
    return String(value);
  }
  return `'${value}'`;
}

function generateCase(caseStatement) {
  if (caseStatement.when) {
    return columnOperators[caseStatement.when.operator](
      caseStatement.when.column,
      caseStatement.when.value,
      caseStatement.when.options,
    );
  }
  let statements;
  let operator;
  if (caseStatement.and) {
    statements = caseStatement.and.map(statement => generateCase(statement));
    operator = 'AND';
  } else if (caseStatement.or) {
    statements = caseStatement.or.map(statement => generateCase(statement));
    operator = 'OR';
  } else {
    throw new Error("Missing 'when', 'and', or 'or' property for CASE statement.");
  }
    
  return `(${statements.join(` ${operator} `)})`;
}

function sqlFromRowFilter(rowFilter) {
  let statements;
  if (rowFilter.and) {
    statements = rowFilter.and.map(subFilter => sqlFromRowFilter(subFilter));
    return `(${statements.join(` AND `)})`;
  } else if (rowFilter.or) {
    statements = rowFilter.or.map(subFilter => sqlFromRowFilter(subFilter));
    return `(${statements.join(` OR `)})`;
  } else {
    return columnOperators[rowFilter.operator](
      rowFilter.column,
      rowFilter.value,
      rowFilter.options,
    );
  }
}

function sqlFromCases(cases) {
  let defaultValue = 'null';
  return cases.reduce((sqlString, caseStatement) => {
    if (caseStatement.default) {
      if (caseStatement.default.value) {
        defaultValue = formatValue(caseStatement.default.value);
      } else if (caseStatement.default.column) {
        defaultValue = caseStatement.default.column;
      }
      return sqlString;
    }
    sqlString += ' WHEN ';
    sqlString += generateCase(caseStatement);
    sqlString += ' THEN ';
    if (typeof caseStatement.then.column === 'string') {
      sqlString += caseStatement.then.column;
    } else if (caseStatement.then.value) {
      sqlString += formatValue(caseStatement.then.value);
    } else {
      throw new Error("Missing 'column' or 'value' property for THEN");
    }
    return sqlString;
  }, 'CASE') + ` ELSE ${defaultValue} END`;
};

module.exports.sqlFromCases = sqlFromCases;
module.exports.sqlFromRowFilter = sqlFromRowFilter;
module.exports.columnOperatorKeys = Object.keys(columnOperators);
