import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const packageJsonPath = path.join(projectRoot, 'package.json');
const androidGradlePath = path.join(projectRoot, 'android', 'app', 'build.gradle');
const iosProjectPath = path.join(projectRoot, 'ios', 'App', 'App.xcodeproj', 'project.pbxproj');

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const appVersion = packageJson.version;

if (!/^\d+\.\d+\.\d+$/.test(appVersion)) {
  throw new Error(`package.json version "${appVersion}" is not valid semantic versioning (expected MAJOR.MINOR.PATCH).`);
}

const androidGradle = fs.readFileSync(androidGradlePath, 'utf8');
const androidMatch = androidGradle.match(/def appVersionName = project\.findProperty\("appVersionName"\) \?: "([^"]+)"/);

if (!androidMatch) {
  throw new Error('Could not find Android versionName default in build.gradle.');
}

if (androidMatch[1] !== appVersion) {
  const nextAndroidGradle = androidGradle.replace(
    /def appVersionName = project\.findProperty\("appVersionName"\) \?: "[^"]+"/,
    `def appVersionName = project.findProperty("appVersionName") ?: "${appVersion}"`
  );
  fs.writeFileSync(androidGradlePath, nextAndroidGradle);
}

const iosProject = fs.readFileSync(iosProjectPath, 'utf8');
const iosMatches = [...iosProject.matchAll(/MARKETING_VERSION = ([^;]+);/g)];

if (iosMatches.length === 0) {
  throw new Error('Could not find iOS MARKETING_VERSION in project.pbxproj.');
}

if (iosMatches.some((match) => match[1] !== appVersion)) {
  const nextIosProject = iosProject.replace(
    /MARKETING_VERSION = [^;]+;/g,
    `MARKETING_VERSION = ${appVersion};`
  );
  fs.writeFileSync(iosProjectPath, nextIosProject);
}

console.log(`Synced semantic app version ${appVersion} to Android and iOS.`);
