function productNameVariableRowFilter() {
  return {
    metadata: {
      templateType: 'variable_row_filter',
      identifier: 'row_filter:product_name',
    },
    inscribeDisplayName: '{value}',
    optional: true,
    optionalName: 'All Apps',
    inscribeDisplayNameOptional: 'All Apps',
    'default': null,
    operator: {
      constant: {
        operator: 'equal',
        displayName: '',
      },
    },
    column: {
      constant: {
        column: 'product_name',
        displayName: '',
      },
    },
    value: {
      choices: {
        select: {
          values: [],
          dynamicValues: {
            distinctValuesColumn: 'product_name',
            mergeStrategy: 'merge',
          },
        },
      },
    },
  };
}

module.exports = productNameVariableRowFilter;