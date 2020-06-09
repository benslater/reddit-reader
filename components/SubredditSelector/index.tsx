import React from 'react';
import { View, FlatList, TouchableOpacity } from 'react-native';

import FloatingView from 'components/FloatingView';
import Text from 'components/Text';

import styles from './styles';

interface SubredditSelectorProps {
  visible: boolean;
  subreddits: any[] | undefined | null;
}

const SubredditSelector = ({
  visible = false,
  subreddits = [],
}: SubredditSelectorProps) => {
  return (
    <FloatingView
      animated
      style={[
        styles.subredditList,
        visible ? styles.visibleList : styles.hiddenList,
      ]}>
      <View style={styles.dropdownArrow} />
      <FlatList
        style={styles.innerList}
        data={subreddits}
        renderItem={({
          item: {
            data: { display_name_prefixed },
          },
          index,
        }) => {
          return (
            <TouchableOpacity key={`${index}`}>
              <View style={styles.textContainer}>
                <Text>{display_name_prefixed}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        keyExtractor={({ data: { display_name_prefixed } }) =>
          display_name_prefixed
        }
      />
    </FloatingView>
  );
};

export default SubredditSelector;