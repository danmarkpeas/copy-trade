const { exec } = require('child_process');

function runSync() {
  exec('node scripts/delta-sync.js', (err, stdout, stderr) => {
    if (err) {
      console.error('Sync error:', err);
    } else {
      console.log('Sync output:', stdout);
    }
    if (stderr) console.error('Sync stderr:', stderr);
  });
}

// Run every 5 seconds (was 60 seconds)
setInterval(runSync, 5 * 1000);
runSync(); // Run immediately on start 