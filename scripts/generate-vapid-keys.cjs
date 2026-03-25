const webpush = require('web-push');

console.log('Generating VAPID keys for Push Notifications...\n');

const vapidKeys = webpush.generateVAPIDKeys();

console.log('='.repeat(60));
console.log('VAPID Keys Generated Successfully!');
console.log('='.repeat(60));
console.log('\nAdd these to your .env file:\n');
console.log(`VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
console.log(`VAPID_SUBJECT=mailto:admin@flyskyguitar.com`);
console.log('\n' + '='.repeat(60));
console.log('\n⚠️  Keep the PRIVATE KEY secret and never commit it to git!');
console.log('✅  You can now use push notifications in your app.\n');
