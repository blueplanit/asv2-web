import "server-only";
import { createTokenCipher, parseKeyringJson } from "@blueplanit/asv2-shared";

const keyringJson = process.env.ASV2_TOKEN_CIPHER_KEYRING_JSON!;
export const tokenCipher = createTokenCipher(parseKeyringJson(keyringJson));
