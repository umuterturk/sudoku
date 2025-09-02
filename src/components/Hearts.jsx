
import { Favorite, FavoriteBorder } from '@mui/icons-material';

const Hearts = ({ lives, maxLives = 3, isShaking = false }) => {
  const hearts = [];
  
  for (let i = 0; i < maxLives; i++) {
    hearts.push(
      <span key={i} className="heart">
        {i < lives ? (
          <Favorite className="heart-filled" />
        ) : (
          <FavoriteBorder className="heart-empty" />
        )}
      </span>
    );
  }
  
  return (
    <div className={`hearts-container ${isShaking ? 'shake' : ''}`}>
      {hearts}
    </div>
  );
};

export default Hearts;
