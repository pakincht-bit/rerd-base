import { supabase, isSupabaseConfigured } from './supabaseClient';

/**
 * Fetch all bookmarked project IDs for a user.
 */
export async function fetchBookmarks(userId: string): Promise<string[]> {
  if (!isSupabaseConfigured) return [];

  const { data, error } = await supabase
    .from('bookmarks')
    .select('project_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch bookmarks:', error);
    return [];
  }

  return (data || []).map((row: { project_id: string }) => row.project_id);
}

/**
 * Add a bookmark for a project.
 */
export async function addBookmark(userId: string, projectId: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;

  const { error } = await supabase
    .from('bookmarks')
    .insert({ user_id: userId, project_id: projectId });

  if (error) {
    // Duplicate bookmark — silently succeed
    if (error.code === '23505') return true;
    console.error('Failed to add bookmark:', error);
    return false;
  }

  return true;
}

/**
 * Remove a bookmark for a project.
 */
export async function removeBookmark(userId: string, projectId: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;

  const { error } = await supabase
    .from('bookmarks')
    .delete()
    .eq('user_id', userId)
    .eq('project_id', projectId);

  if (error) {
    console.error('Failed to remove bookmark:', error);
    return false;
  }

  return true;
}
