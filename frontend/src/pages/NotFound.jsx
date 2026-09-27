import { Link } from 'react-router-dom';

export default function NotFound() {
 
  return (
  <main className="section page-top">
    <div className="container">
      <div className="empty large">
        <span className="kicker">
          404
        </span>

        <h1>
          That page has left the shelf.
        </h1>

        <p>
          Try the catalogue instead.
        </p>

        <Link
          to="/books"
          className="btn btn-dark"
        >
          Browse books
        </Link>
      </div>
    </div>
  </main>
);
}
