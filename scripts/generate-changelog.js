const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Determine the path for the release notes file (in project root)
const releaseNotesPath = path.join(__dirname, '../release-notes.md');

try {
  // Check if release notes already exist and are not empty
  if (fs.existsSync(releaseNotesPath) && fs.statSync(releaseNotesPath).size > 0) {
    console.log('Release notes file already exists. Skipping auto-generation to preserve manual edits.');
    // Optional: Check if we want to force overwrite via env var, e.g. FORCE_CHANGELOG=true
    if (!process.env.FORCE_CHANGELOG) {
      process.exit(0);
    }
  }

  console.log('Generating release notes...');

  // Try to find the last tag
  let lastTag;
  try {
    // Get the latest tag on the current branch
    // 2>nul suppresses error output on Windows if no tags exist
    lastTag = execSync('git describe --tags --abbrev=0 2>nul', { encoding: 'utf8' }).trim();
    console.log(`Last tag found: ${lastTag}`);
  } catch (e) {
    console.log('No tags found. Generating changelog from full history.');
  }

  // Determine git log range
  // If we found a tag, list commits from that tag to HEAD.
  // If no tag, list all commits (HEAD).
  const range = lastTag ? `${lastTag}..HEAD` : 'HEAD';

  // Get git log
  // Format: "- Subject (Hash)"
  // %s = subject, %h = short hash
  const logCommand = `git log ${range} --pretty=format:"- %s (%h)"`;
  const logs = execSync(logCommand, { encoding: 'utf8' });

  // Filter and format logs
  // 1. Split by newline
  // 2. Filter out empty lines
  // 3. Optional: Filter out 'chore' or 'release' commits if desired
  const cleanLogs = logs
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n');

  if (!cleanLogs) {
    console.log('No new commits found since last tag.');
    // Write a default message to avoid empty file errors
    fs.writeFileSync(releaseNotesPath, 'Maintenance update (no new commits detected).');
  } else {
    // Add a header
    const content = `## What's Changed\n\n${cleanLogs}`;
    fs.writeFileSync(releaseNotesPath, content);
    console.log(`Release notes generated at: ${releaseNotesPath}`);
    console.log('Preview:\n' + content);
  }

} catch (error) {
  console.error('Error generating release notes:', error);
  // Fallback to ensure build doesn't fail
  try {
    fs.writeFileSync(releaseNotesPath, '## Update\n\nSee commit history for details.');
    console.log('Fallback release notes created.');
  } catch (writeError) {
    console.error('Failed to write fallback release notes:', writeError);
    process.exit(1);
  }
}
