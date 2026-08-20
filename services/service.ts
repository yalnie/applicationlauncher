import Service, { Message } from 'webos-service';
import * as fs from 'fs';
import * as path from 'path';
import serviceInfo from './services.json';

const service = new Service(serviceInfo.id);

service.register('listApps', (message: Message) => {
  service.call('luna://org.webosbrew.hbchannel.service/exec', {
    command: "luna-send -n 1 luna://com.webos.applicationManager/listApps '{}'"
  }, (response) => {
    try {
      if (response.payload && response.payload.stdoutString) {
        const parsedData = JSON.parse(response.payload.stdoutString);
        let apps = parsedData.apps || [];

        apps = apps.map((app: any) => {
          if (app.icon && app.folderPath) {
            const iconPath = path.join(app.folderPath, app.icon);
            if (fs.existsSync(iconPath)) {
              try {
                const bitmap = fs.readFileSync(iconPath);
                const base64Str = Buffer.from(bitmap).toString('base64');
                const ext = path.extname(app.icon).replace('.', '') || 'png';
                app.icon = `data:image/${ext};base64,${base64Str}`;
              } catch (e) {
              }
            }
          }
          return app;
        });

        message.respond({
          returnValue: true,
          apps: apps
        });
      } else {
        message.respond({ returnValue: false, errorText: "No stdout received." });
      }
    } catch (err: any) {
      message.respond({ returnValue: false, errorText: "Parse error: " + err.message });
    }
  });
});

interface LaunchPayload {
  id?: string;
}

service.register('launchApp', (message: Message) => {
  const payload = message.payload as LaunchPayload;
  if (!payload.id) {
    message.respond({ returnValue: false, errorText: 'Missing application id' });
    return;
  }
  service.call('luna://com.webos.applicationManager/launch', { id: payload.id }, (response) => {
    message.respond(response.payload);
  });
});
