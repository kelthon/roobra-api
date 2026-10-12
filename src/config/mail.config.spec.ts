import mailConfig from './mail.config.js';

describe('mailConfig', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('should use implicit TLS on port 465', () => {
    vi.stubEnv('EMAIL_PORT', '465');

    expect(mailConfig().mail).toMatchObject({ port: 465, secure: true });
  });

  it.each(['587', '25', '1025'])(
    'should not use implicit TLS on port %s',
    (port) => {
      vi.stubEnv('EMAIL_PORT', port);

      expect(mailConfig().mail).toMatchObject({
        port: Number(port),
        secure: false,
      });
    },
  );
});
