import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/shared/config/firebase';

interface GithubSettings {
  token: string;
  repo: string; // e.g. "Shyam-3/ncc-app"
}

/**
 * Triggers the Auth Account Cleanup workflow on GitHub Actions.
 * Fails silently if settings are not configured or request fails.
 */
export async function triggerAuthCleanup(): Promise<void> {
  try {
    const settingsDoc = await getDoc(doc(db, 'settings', 'github'));
    
    if (!settingsDoc.exists()) {
      console.warn('GitHub settings not configured. Skipping auth cleanup trigger.');
      return;
    }

    const { token, repo } = settingsDoc.data() as GithubSettings;
    
    if (!token || !repo) {
      console.warn('Incomplete GitHub settings. Skipping auth cleanup trigger.');
      return;
    }

    // Sanitize repo string in case user pasted full URL (e.g., https://github.com/Shyam-3/ncc-app/)
    let cleanRepo = repo.trim();
    const match = cleanRepo.match(/github\.com\/([^/]+\/[^/]+)/);
    if (match) {
      cleanRepo = match[1].replace(/\.git$/, '').replace(/\/$/, '');
    } else {
      cleanRepo = cleanRepo.replace(/\/$/, '');
    }

    const response = await fetch(`https://api.github.com/repos/${cleanRepo}/actions/workflows/auth-cleanup.yml/dispatches`, {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ ref: 'main' })
    });

    if (!response.ok) {
      console.error('Failed to trigger GitHub Action:', await response.text());
    } else {
      console.log('Successfully triggered GitHub Action for Auth Cleanup.');
    }
  } catch (error) {
    console.error('Error triggering GitHub action:', error);
  }
}
