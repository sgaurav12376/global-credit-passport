create table if not exists review_document_requests (
  id uuid primary key,
  share_grant_id uuid not null references passport_share_grants(id) on delete cascade,
  document_type varchar(100) not null,
  description varchar(1000),
  is_required boolean not null default true,
  due_date date,
  status varchar(40) not null,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create index if not exists idx_review_document_requests_share
  on review_document_requests(share_grant_id, created_at);

create table if not exists review_document_submissions (
  id uuid primary key,
  request_id uuid not null references review_document_requests(id) on delete cascade,
  storage_key varchar(500) not null,
  original_filename varchar(255) not null,
  content_type varchar(100) not null,
  size_bytes bigint not null,
  uploaded_at timestamptz not null,
  superseded_at timestamptz
);

create index if not exists idx_review_document_submissions_request
  on review_document_submissions(request_id, uploaded_at desc);
