import { NextPageContext } from 'next';

function Error({ statusCode }: { statusCode?: number }) {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-xl text-gray-400">
        {statusCode
          ? `An error ${statusCode} occurred on server`
          : 'An error occurred on client'}
      </p>
    </div>
  );
}

Error.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default Error;
