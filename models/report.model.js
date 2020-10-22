const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Sanitizing = require('../modules/sanitizing');
const PathRepresentable = require('../modules/path-representable');
const Access = require('../modules/access');
const SQLQuery = require('./sql-query.model');
const Template = require('./template.model');
const masterPerformanceTemplateFactory = require('./templates/master-performance.template');
const filteredTemplate = require('./templates/template-utilities').filteredTemplate;
const uuid = require('uuid').v4;
const {
  mapMongoError,
  NotFoundError,
  InternalServerError,
} = require('../modules/error');

const ReportSchema = Schema({
  path: {
    type: String,
    required: 'Please provide a path',
    unique: true,
  },
  displayName: {
    type: String,
    required: 'Please provide a name',
  },
  date: {
    type: Date,
    default: Date.now,
  },
  content: {
    type: Object,
    required: 'Please provide report content',
  },
  reportVersion: {
    type: Number,
  },
}, {minimize: false});

ReportSchema.pre('remove', async function(next) {
  const reportTemplatePaths= await Template.search({pathPattern: `^${this.path}`})
  await Template.deleteByPaths(reportTemplatePaths);
  next();
});

Sanitizing.addToSchema(ReportSchema, ['exposableProperties']);
ReportSchema.virtual('exposableProperties').get(function() {
  return [
    'path',
    'displayName',
    'date',
    'reportVersion',
    'content',
  ];
});

PathRepresentable.addToSchema(ReportSchema, ['path']);

ReportSchema.methods.generateEmbedPaths = function() {
  ['mode', 'periscope', 'xyla'].forEach(type => {
    for (let uid in this.content[type]) {
      if (typeof this.content[type][uid].embed === 'object') {
        this.content[type][uid].embed.path = `${this.path}${Access.separator}${Access.pathFromComponents(['embeds', type, uid])}`;
      }
    }
  });
};

let Report = mongoose.model('Report', ReportSchema);

Report.validatePeriscopeFilters = function(embed) {
  let pathComponents = Access.componentsFromPath(embed.path);
  if (pathComponents.length >= 2 && pathComponents[0] === 'companies') {
    let companyIdentifier = pathComponents[1];
    embed.params.filters.forEach(filter => {
      if (filter.name === 'schema' && filter.value !== companyIdentifier) {
        throw new Error(`Periscope embed's schema filter must match the company identifier in its path (${embed.path})`);
      }
    });
    if (!embed.params.filters.map(filter => filter.name).includes('schema')) {
      throw new Error(`Periscope embed must contain a schema filter that matches the company identifier in its path (${embed.path})`);
    }
    if (embed.params.visible.includes('schema')) {
      throw new Error(`Periscope embed with a company identifier in its path (${embed.path}) must not contain a visible schema filter`);
    }
  }
};

Report.validateXylaQueryPath = async function(embed) {
  let query = await SQLQuery.getByPath(embed.queryPath);
  if (query === null) { throw new NotFoundError('queryPath', embed.queryPath); }
  if (Access.isGlobalPath(query.path)) { return; }
  let queryPathComponents = Access.componentsFromPath(query.path);
  let embedPathComponents = Access.componentsFromPath(embed.path);
  if (queryPathComponents.length < 2 || queryPathComponents[0] !== 'companies') {
    throw new InternalServerError();
  }
  if (embedPathComponents.length < 2 || embedPathComponents[0] !== 'companies') {
    throw new InternalServerError();
  }
  let queryCompanyIdentifier = queryPathComponents[1];
  let embedCompanyIdentifier = embedPathComponents[1];
  if (queryCompanyIdentifier !== embedCompanyIdentifier) {
    throw new NotFoundError('queryPath', embed.queryPath);
  }
};

Report.fromPathAndParameters = async function(path, parameters) {
  const report = new Report(parameters);
  delete report.date;
  report.path = path;
  report.generateEmbedPaths();
  for (let uid in report.content.xyla) {
    if (report.content.xyla[uid].embed) {
      await Report.validateXylaQueryPath(report.content.xyla[uid].embed);
    }
  }
  for (let uid in report.content.periscope) {
    Report.validatePeriscopeFilters(report.content.periscope[uid].embed);
  }
  return report;
};

Report.create = function(newReport) {
  return newReport.save()
    .catch(error => { throw mapMongoError(error); });
};

Report.update = function(report) {
  return report.save()
    .catch(error => { throw mapMongoError(error); });
};

Report.deleteByPath = function(path) {
  return Report.findOne({path: path}).then(report => {
    if (report === null) { throw new NotFoundError(); }
    return report.remove();
  });
};

Report.getByPath = function(path) {
  return Report.findOne({path: path});
};

Report.createDefaultXylaReport = async function(companyIdentifier) {
  const queryPath = 'global_queries_core.performance';
  let defaultReportPath = `companies_${companyIdentifier}_reports_dashboard`;
  let masterPerformanceTemplate = masterPerformanceTemplateFactory();
  let masterTemplate = Template.buildTemplate({
    prefixPath: Access.pathFromComponents(Access.componentsFromPath(defaultReportPath).concat(['protected'])),
    metadata: Template.buildMetadata(Object.assign({}, masterPerformanceTemplate.metadata, {
      more: {
        mergePath: Template.buildTemplatePath({
          templateType: masterPerformanceTemplate.metadata.templateType,
          identifier: masterPerformanceTemplate.metadata.identifier,
          prefixPath: Access.pathFromComponents(['global']),
        }),
      },
    })),
    parameters: filteredTemplate({
      template: masterPerformanceTemplate,
      metadata: false,
    }),
  });
  let bigNumberTemplates = [
    'spend',
    'dynamic_column:product_events:event_sum:install',
    'dynamic_column:product_events:cost_per_event:install',
  ].map((metric, index) => Template.buildTemplate({
    prefixPath: Access.pathFromComponents(Access.componentsFromPath(defaultReportPath).concat(['unprotected'])),
    metadata: Template.buildMetadata({
      templateType: 'big_number',
      parentPath: masterTemplate.path,
    }),
    parameters: {
      structure: {
        displayColumn: {
          uid: uuid(),
          // TODO: do a migration and code refactor
          // metadata: {
          //   templateType: 'display_column',
          //   identifier: uuid(),
          // },
          // parameters -> options
          // identifier -> columnIdentifier
          // wrap options and columnIdentifier in 'structure'
          parameters: {},
          identifier: metric,
        },
        size: (index) ? 'normal' : 'large',
      },
    },
  }));
  let summaryPanelTemplate = Template.buildTemplate({
    prefixPath: Access.pathFromComponents(Access.componentsFromPath(defaultReportPath).concat(['protected'])),
    metadata: Template.buildMetadata({
      templateType: 'group',
      identifier: 'summary-panel',
      parentPath: masterTemplate.path,
      version: 1,
      more: {
        groupKey: 'summaryPanel',
      },
    }),
    parameters: {
      queryParameters: {
        interval: {
          value: 30,
          unit: 'day',
        },
      },
      structure: {
        displayName: 'Summary',
        templates: bigNumberTemplates.map(template => { return { reference: template.path } }),
      }
    },
  });
  let breakdownTableTemplate = Template.buildTemplate({
    prefixPath: Access.pathFromComponents(Access.componentsFromPath(defaultReportPath).concat(['protected'])),
    metadata: Template.buildMetadata({
      templateType: 'breakdown_table',
      identifier: 'breakdown-table',
      parentPath: masterTemplate.path,  
    }),
    parameters: {
      queryParameters: {
        interval: {
          value: 30,
          unit: 'day',
        },
      },
      structure: {
        displayColumns: [
          // TODO update these when refactoring
          { uid: uuid(), identifier: 'spend', parameters: {} },
          { uid: uuid(), identifier: 'dynamic_column:product_events:event_sum:install', parameters: {} },
          { uid: uuid(), identifier: 'dynamic_column:product_events:cost_per_event:install', parameters: {} },
        ],
        displayBreakdownIdentifiers: [
          'channel',
          'platform',
          'campaign_name',
        ],
        options: {},
      },
    },
  });
  let breakdownTableDeckTemplate = Template.buildTemplate({
    prefixPath: Access.pathFromComponents(Access.componentsFromPath(defaultReportPath).concat(['protected'])),
    metadata: Template.buildMetadata({
      templateType: 'deck',
      identifier: 'breakdown-table-deck',
      parentPath: masterTemplate.path,
    }),
    parameters: {
      structure: {
        templates: [
          { reference: breakdownTableTemplate.path },
        ],
      },
    },
  });
  let defaultReport = await Report.fromPathAndParameters(defaultReportPath, { 
    displayName: 'Core',
    content: {
      layout: {
        layout_main: {
          orientation: 'vertical',
          layoutIDs: [ 'elements_performance' ],
        },
      },
      mode: {},
      periscope: {},
      xyla: {
        elements_performance: {
          metadata: {
            identifier: uuid(),
            templateType: 'dashboard_content',
          },
          structure: {
            groups: {
              summaryPanel: { reference: summaryPanelTemplate.path },
            },
            decks: {
              breakdownTable: { reference: breakdownTableDeckTemplate.path },
            },
          },
        },
      },
    },
  });

  let existingReport = await Report.getByPath(defaultReport.path);
  if (existingReport) { return null; }
  let allTemplates = [
    masterTemplate,
    summaryPanelTemplate,
    breakdownTableDeckTemplate,
    breakdownTableTemplate,
  ].concat(bigNumberTemplates.concat());
  await Template.create(allTemplates);
  return await Report.create(defaultReport);
};

Report.getAllByCompany = async function(companyIdentifier) {
  const reports = await Report
    .find({ path: { $regex: `^companies_${Access.regExpEscapedPathComponent(companyIdentifier)}_`}})
    .sort({ 'displayName': 1 })
    .sort({ 'date': -1 });
  return reports;
};

Report.getAll = async function() {
  const reports = await Report
    .find({ path: { $regex: `^companies_`}})
    .sort({ 'path': 1 })
    .sort({ 'date': -1 });
  return reports;
};

Report.getEmbeds = async function(embedPaths) {
  let reportPaths = embedPaths.map(path => {
    let components = Access.componentsFromPath(path);
    if (components.length < 4) { return null; }
    return Access.pathFromComponents(components.slice(0, -3));
  }).filter(path => path !== null);
  reportPaths = Array.from(new Set(reportPaths));
  let reports = await Report.find({ path: { '$in': reportPaths } });
  let embeds = [].concat.apply(
    [],
    reports.map(report => [].concat.apply(
      [],
      ['mode', 'periscope'].map(contentType => Object.keys(report.content[contentType]).map(uid => report.content[contentType][uid].embed))
    ))
  );
  embeds = embeds
    .filter(embed => embed)
    .filter(embed => embedPaths.includes(embed.path));
  let requestedPaths = new Set(embedPaths);
  let retrievedPaths = embeds.map(embed => embed.path);
  requestedPaths.forEach(path => {
    if (!retrievedPaths.includes(path)) {
      throw new Error(`Embed with path ${path} not found`);
    }
  });
  if (retrievedPaths.length !== embedPaths.length) {
    throw new Error(`Duplicate embed paths retrieved ${retrievedPaths}`);
  }
  return embeds;
};

module.exports = Report;
