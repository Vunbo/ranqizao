import { Fragment } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { hasAuthToken } from './lib/auth';
import { ProtectedRoute } from './router/ProtectedRoute';
import { APP_ROUTES, OPS_ROUTES } from './router/routes';

function App() {
  return (
    <Router>
      <Routes>
        {APP_ROUTES.map((route) => {
          const element = route.protected ? <ProtectedRoute>{route.element}</ProtectedRoute> : route.element;
          return (
            <Fragment key={route.path}>
              <Route path={route.path} element={element} />
            </Fragment>
          );
        })}

        {/* Default Redirect */}
        <Route
          path={OPS_ROUTES.root}
          element={
            hasAuthToken()
              ? <Navigate to={OPS_ROUTES.dashboard} replace />
              : <Navigate to={OPS_ROUTES.login} replace />
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
