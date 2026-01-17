/**
 * Constantes compartilhadas do sistema
 */

// Logo do sistema
// Para forçar atualização após mudar o logo, incremente o número abaixo e reinicie o servidor
const LOGO_VERSION = 2

// Usa timestamp para cache-busting (mais confiável que query string no Next.js Image)
export const LOGO_URL = `/logo-OrganizaPay.png?t=${LOGO_VERSION}`
