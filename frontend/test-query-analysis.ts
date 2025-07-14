// Test script to analyze the query "Tell me about the zen sciences meeting"

import { analyzeQuery } from './src/lib/agents/queryAnalyzer';

// Test query
const testQuery = "Tell me about the zen sciences meeting";

console.log("Testing query:", testQuery);
console.log("=".repeat(60));

// Analyze the query
const result = analyzeQuery(testQuery);

console.log("Analysis Result:");
console.log(JSON.stringify(result, null, 2));

// Check if it would trigger a search based on the shouldPerformAgenticSearch logic
console.log("\n" + "=".repeat(60));
console.log("Search Trigger Analysis:");

// Check for search keywords
const searchKeywords = ['search', 'find', 'show me', 'last month', 'weeks ago'];
const queryLower = testQuery.toLowerCase();
const hasSearchKeyword = searchKeywords.some(keyword => queryLower.includes(keyword));

console.log("Has search keyword:", hasSearchKeyword);
console.log("Intent:", result.intent);
console.log("Topics found:", result.topics);
console.log("Entities found:", result.entities);
console.log("Participants found:", result.participants);
console.log("Temporal info:", result.temporal);
console.log("Confidence:", result.confidence);

// Determine if search would be triggered based on shouldPerformAgenticSearch logic
const wouldTriggerSearch = 
  hasSearchKeyword || // Test keywords
  result.intent === 'search' ||
  result.participants.length > 0 ||
  result.entities.length > 0 ||
  result.topics.length > 2 ||
  (result.intent === 'summary' && (result.topics.length > 1 || result.participants.length > 1));

console.log("\nWould trigger search:", wouldTriggerSearch);

// Additional keyword extraction logic that might be missing "zen sciences"
console.log("\n" + "=".repeat(60));
console.log("Additional Analysis:");

// Look for capitalized words that might be project/meeting names
const capitalizedWords = testQuery.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g);
console.log("Capitalized words found:", capitalizedWords);

// Look for potential meeting/project patterns
const meetingPattern = /\b(\w+(?:\s+\w+)*)\s+meeting\b/gi;
const meetingMatches = [...testQuery.matchAll(meetingPattern)];
console.log("Meeting pattern matches:", meetingMatches.map(m => m[1]));

// Check if "zen sciences" should be extracted as a topic
const words = testQuery.toLowerCase().split(/\s+/);
console.log("All words:", words);

// Check for multi-word phrases before "meeting"
const beforeMeeting = testQuery.toLowerCase().match(/(.+)\s+meeting/);
if (beforeMeeting) {
  console.log("Phrase before 'meeting':", beforeMeeting[1].trim());
}

// Test with variations
console.log("\n" + "=".repeat(60));
console.log("Testing variations:");

const variations = [
  "Tell me about the zen sciences meeting",
  "Tell me about the Zen Sciences meeting",
  "Find the zen sciences meeting",
  "Show me the zen sciences meeting",
  "What happened in the zen sciences meeting",
  "zen sciences project meeting",
  "meeting with zen sciences team"
];

variations.forEach(query => {
  const analysis = analyzeQuery(query);
  console.log(`\nQuery: "${query}"`);
  console.log(`Intent: ${analysis.intent}, Topics: ${analysis.topics.join(', ')}, Confidence: ${analysis.confidence}`);
});