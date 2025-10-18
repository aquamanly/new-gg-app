import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://yidcglxaphpcphljohvo.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpZGNnbHhhcGhwY3BobGpvaHZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1MzI1ODIsImV4cCI6MjA3NjEwODU4Mn0.w7aNZ8w9FUFysh1CGKpVEi6zU0NT3UOLaievoDTkfYk';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
