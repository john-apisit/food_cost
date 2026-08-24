-- Non-owners may delete their own membership (leave a store).
-- Admins can still remove other non-owner members via the existing policy.

CREATE POLICY "Members can leave stores they do not own"
  ON public.store_members FOR DELETE
  USING (
    user_id = auth.uid()
    AND user_id <> public.store_created_by(store_id)
  );
