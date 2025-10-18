/**
 * Prompts Module - Entry Point
 *
 * This module exports all prompt-related functionality in one place.
 * Makes it easy to import and use prompts throughout the application.
 *
 * @example
 * const { getFullPrompt, buildToolsArray } = require('./prompts');
 */

const systemPrompts = require('./systemPrompts');
const functionTools = require('./functionTools');
const behaviorRules = require('./behaviorRules');
const examples = require('./examples');

module.exports = {
  // System Prompts
  ...systemPrompts,

  // Function Tools
  ...functionTools,

  // Behavior Rules
  ...behaviorRules,

  // Examples
  ...examples,

  // Convenient all-in-one exports
  prompts: {
    system: systemPrompts,
    functions: functionTools,
    behaviors: behaviorRules,
    examples: examples
  }
};
