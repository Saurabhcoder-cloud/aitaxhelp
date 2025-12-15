export class SESClient {
  constructor(_config: any) {}
  send() {
    return Promise.resolve({});
  }
}

export const SendEmailCommand = function (args: any) {
  return args;
};
