import { Route, Routes } from 'react-router-dom';
import { SiteLayout } from './layouts/SiteLayout';
import { ArticlePage } from './pages/Article';
import { EditionPage, LatestEditionRedirect } from './pages/Edition';
import { HomePage } from './pages/Home';
import { ArchivePage, CategoryPage, CompanyPage, DayPage, EditionsPage, LatestPage } from './pages/Lists';
import { RegionPage } from './pages/Region';
import { SearchPage } from './pages/Search';
import { AboutPage, MarketsPage, NotFoundPage, StatusPage } from './pages/Static';

export function App() {
  return (
    <SiteLayout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/india" element={<RegionPage region="india" />} />
        <Route path="/world" element={<RegionPage region="world" />} />
        <Route path="/latest" element={<LatestPage />} />
        <Route path="/article/:slug" element={<ArticlePage />} />
        <Route path="/edition/:region" element={<LatestEditionRedirect />} />
        <Route path="/edition/:region/:date" element={<EditionPage />} />
        <Route path="/weekly/:region/:date" element={<EditionPage kind="weekly" />} />
        <Route path="/editions" element={<EditionsPage />} />
        <Route path="/category/:id" element={<CategoryPage />} />
        <Route path="/markets" element={<MarketsPage />} />
        <Route path="/archive" element={<ArchivePage />} />
        <Route path="/archive/:date" element={<DayPage />} />
        <Route path="/company/:slug" element={<CompanyPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/status" element={<StatusPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </SiteLayout>
  );
}
