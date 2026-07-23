-- Documentation only (B4 from the security review): bcrypt (via pgcrypto's
-- crypt()/gen_salt('bf')) truncates its input to 72 bytes. This is a
-- well-known, standard limitation of the algorithm itself, not a bug here —
-- and it's consistent between the two functions below (both hash/compare
-- with the same crypt() call), so a password longer than 72 bytes still
-- verifies correctly, it just has no additional entropy past that point.
comment on function public.set_link_password(uuid, text) is
  'Hashes p_password with bcrypt via pgcrypto crypt()/gen_salt(''bf''). Note: bcrypt truncates input to 72 bytes (standard algorithm limitation, not a bug) — consistent with verify_link_password, which hashes/compares the same way.';

comment on function public.verify_link_password(text, text) is
  'Compares p_password against the stored bcrypt hash via pgcrypto crypt(). Note: bcrypt truncates input to 72 bytes (standard algorithm limitation, not a bug) — consistent with set_link_password.';
