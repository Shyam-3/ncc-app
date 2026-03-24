// CMS feature type definitions

export interface CmsDocument {
  id?: string;
  slug: string;
  title: string;
  sections: Section[];
  metadata: CmsMetadata;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface Section {
  id?: string;
  heading: string;
  body: string;
  type: 'text' | 'markdown' | 'html';
  order: number;
}

export interface CmsMetadata {
  author: string;
  status: 'draft' | 'published' | 'archived';
  tags: string[];
  seoTitle?: string;
  seoDescription?: string;
}

export interface CmsFragment {
  key: string;
  content: string;
  type: 'text' | 'html';
  lastUpdated: string;
}
