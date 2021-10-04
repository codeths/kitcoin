<script>
  /*
    Item: {img: '/path/to/image.png', price: 20, name: 'Super Cool Item'}
    This will change in the future, with things like a link being added.
  */
  export let items = [];  // An array of items. (See above)
  let buttonStates = {
    left: false,
    right: false
  };
  let offset = 0;

  const handleClick = btn => {  // TODO: constrain this so that you can't just 'scroll' forever
    switch (btn) {
      case 'left':
        offset += 75;
        break;
      case 'right':
        offset -= 75;
        break;
    }
  };
</script>

<div class='p-4 flex'>
  <button class='p-auto px-2 flex-shrink-0' class:opacity-40={buttonStates.left} disabled={buttonStates.left} on:click={() => handleClick('left')}>
    <img src='assets/arrow_left.png' alt='left arrow' class='h-10 w-10'>
  </button>
  <div class='flex-grow overflow-hidden'>
    {#if items.length != 0}
      <div class='flex relative transition duration-100' style='transform: translate({offset}px, 0px);'>
        {#each items as item}
          <div class='flex-shrink-0 m-6 flex flex-col justify-between' style='max-width: 14rem;'>
            <img src={item.img} alt={item.name} style='max-width: 13rem; max-height: 13rem; width: max-content;'>
            <div>
              <h2 class='text-lg text-gray-600'>{item.name}</h2>
              <h1 class='text-2xl font-bold'>${item.price}</h1>
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <h1>Array is empty</h1>
    {/if}
  </div>
  <button class='p-auto px-2 flex-shrink-0' class:opacity-40={buttonStates.right} disabled={buttonStates.right} on:click={() => handleClick('right')}>
    <img src='assets/arrow_left.png' alt='left arrow' class='h-10 w-10 transform rotate-180'>
  </button>
</div>
